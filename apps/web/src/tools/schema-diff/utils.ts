import type { SchemaDiffInput, SchemaDiffOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class SchemaDiffError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaDiffError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 100_000

/** 字段的一组可比属性；统一用字符串承载，避免 undefined / null 参与比较 */
export interface SchemaField {
  readonly name: string
  readonly type: string
  /** '' 表示未显式声明；'true' / 'false' 表示明确写了可取性 */
  readonly nullable: string
  readonly primaryKey: string
  readonly unique: string
  readonly autoIncrement: string
  readonly defaultValue: string
  readonly comment: string
}

/** 一张表：表名 + 字段列表（保持原文顺序） */
export interface SchemaTable {
  readonly name: string
  readonly fields: readonly SchemaField[]
}

/** 参与对比的字段属性 */
export const COMPARED_PROPS = [
  'type',
  'nullable',
  'primaryKey',
  'unique',
  'autoIncrement',
  'defaultValue',
] as const

export type ComparedProp = (typeof COMPARED_PROPS)[number]

/** 属性名 → 报告里的中文标签 */
const PROP_LABEL: Record<ComparedProp, string> = {
  type: '类型',
  nullable: '可空',
  primaryKey: '主键',
  unique: '唯一',
  autoIncrement: '自增',
  defaultValue: '默认值',
}

/** 空字段模板：未声明的属性一律留空串 */
function makeField(name: string, type: string, extra: Partial<SchemaField> = {}): SchemaField {
  return {
    name,
    type,
    nullable: extra.nullable ?? '',
    primaryKey: extra.primaryKey ?? '',
    unique: extra.unique ?? '',
    autoIncrement: extra.autoIncrement ?? '',
    defaultValue: extra.defaultValue ?? '',
    comment: extra.comment ?? '',
  }
}

// ---------------------------------------------------------------------------
// SQL DDL
// ---------------------------------------------------------------------------

const OPEN_QUOTES = '`"\u005b'

/**
 * 取串首标识符：支持反引号 / 双引号 / 方括号包裹。
 * `end` 是标识符在原串中的结束下标，调用方要靠它定位紧随其后的 `(`。
 */
export function takeIdentifier(text: string): {
  name: string
  rest: string
  end: number
} {
  const offset = text.length - text.trimStart().length
  const head = text.trimStart()
  const quote = head[0]
  if (quote !== undefined && OPEN_QUOTES.includes(quote)) {
    const closer = quote === '\u005b' ? '\u005d' : quote
    const end = head.indexOf(closer, 1)
    if (end > 0) {
      return { name: head.slice(1, end), rest: head.slice(end + 1).trim(), end: offset + end + 1 }
    }
  }
  const match = /^[A-Za-z_]\w*/.exec(head)
  if (match) {
    return {
      name: match[0],
      rest: head.slice(match[0].length).trim(),
      end: offset + match[0].length,
    }
  }
  return { name: '', rest: head, end: offset }
}

/** 去掉 SQL 的行注释与块注释，避免注释里的逗号破坏切分 */
export function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
}

/** 按顶层逗号切串：括号内的逗号（decimal(10,2)）不算分隔符 */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts.map((part) => part.trim()).filter((part) => part !== '')
}

/** 遇到这些关键字就认为「类型部分」到此结束 */
const CONSTRAINT_KEYWORDS = new Set([
  'not',
  'null',
  'primary',
  'unique',
  'default',
  'comment',
  'references',
  'check',
  'collate',
  'generated',
  'auto_increment',
  'autoincrement',
  'unsigned',
  'zerofill',
  'on',
  'as',
  'stored',
  'virtual',
  'identity',
])

/** 表级约束行：单独解释（`PRIMARY KEY (a)` 需要回填到列上），不当作普通列处理 */
const TABLE_CONSTRAINT = /^(primary\s+key|unique|key|index|constraint|check|foreign\s+key)\b/i

/**
 * 把 `id bigint unsigned not null auto_increment` 这样的列定义拆成字段属性。
 * 类型部分一直取到第一个约束关键字为止，`character varying(10)` 这类多词类型因此得以保留。
 */
export function parseColumnDefinition(definition: string): SchemaField | null {
  const { name, rest } = takeIdentifier(definition)
  if (name === '') return null

  const tokens = rest.split(/\s+/).filter((token) => token !== '')
  const typeTokens: string[] = []
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index] ?? ''
    if (CONSTRAINT_KEYWORDS.has(token.toLowerCase())) break
    typeTokens.push(token)
    // 类型与长度被空格拆开时（`decimal (10, 2)`）继续吃到右括号
    if (token.includes('(') && !token.includes(')')) {
      while (index + 1 < tokens.length && !(tokens[index + 1] ?? '').includes(')')) {
        index += 1
        typeTokens.push(tokens[index] ?? '')
      }
      if (index + 1 < tokens.length) {
        index += 1
        typeTokens.push(tokens[index] ?? '')
      }
    }
    index += 1
  }
  let type = typeTokens.join(' ')
  const tailTokens = tokens.slice(index)
  const tailWords = tailTokens.map((token) => token.toLowerCase())

  // SchemaField 的属性带 readonly，`Partial<...>` 会保留 readonly，
  // 因此这里用各自独立的局部变量累积，最后一次性交给 makeField
  let nullable = ''
  if (/\bnot\s+null\b/i.test(definition)) nullable = 'false'
  else if (/\bnull\b/i.test(definition)) nullable = 'true'
  const primaryKey = /\bprimary\s+key\b/i.test(definition) ? 'true' : ''
  const unique = /\bunique\b/i.test(definition) ? 'true' : ''
  const autoIncrement = /\bauto_increment\b|\bautoincrement\b|\bidentity\b/i.test(definition)
    ? 'true'
    : ''
  if (/\bunsigned\b/i.test(definition)) type = `${type} unsigned`.trim()

  let defaultValue = ''
  const defaultAt = tailWords.indexOf('default')
  if (defaultAt >= 0) {
    // 取到下一个已知约束关键字之前的所有内容，容纳 now()、`'abc'`、`-1` 等写法
    const values: string[] = []
    for (let i = defaultAt + 1; i < tailTokens.length; i += 1) {
      if (CONSTRAINT_KEYWORDS.has((tailWords[i] ?? '').toLowerCase())) break
      values.push(tailTokens[i] ?? '')
    }
    defaultValue = values.join(' ').replace(/^'|'$/g, '')
  }

  const commentMatch = /comment\s+'([^']*)'|comment\s+"([^"]*)"/i.exec(definition)
  const comment = commentMatch ? (commentMatch[1] ?? commentMatch[2] ?? '') : ''

  return makeField(name, type, {
    nullable,
    primaryKey,
    unique,
    autoIncrement,
    defaultValue,
    comment,
  })
}

/** 取出建表语句里第一对配对的括号之间的内容 */
function parenBody(statement: string, from: number): string {
  let depth = 0
  for (let i = from; i < statement.length; i += 1) {
    if (statement[i] === '(') depth += 1
    if (statement[i] === ')') {
      depth -= 1
      if (depth === 0) return statement.slice(from + 1, i)
    }
  }
  return statement.slice(from + 1)
}

/** 表级主键 / 唯一键回填：把约束里的列名标到已解析出的列上 */
function applyTableConstraint(fields: SchemaField[], part: string): void {
  const list = /\(([^)]*)\)/.exec(part)
  if (!list) return
  const names = (list[1] ?? '')
    .split(',')
    .map((item) => item.trim().replace(/[`"\u005b\u005d]/g, ''))
    .filter((item) => item !== '')
  const patch = /^primary\s+key/i.test(part) ? { primaryKey: 'true' } : { unique: 'true' }
  for (const name of names) {
    const index = fields.findIndex((field) => field.name === name)
    if (index < 0) continue
    const previous = fields[index]
    if (previous) fields[index] = { ...previous, ...patch }
  }
}

/**
 * 解析 SQL DDL：只认 CREATE TABLE，其余语句忽略。
 * 局限（README「限制」有说明）：按 `;` 切语句、不处理表选项与外键目标的具体差异。
 */
export function parseSqlSchema(sql: string): readonly SchemaTable[] {
  const cleaned = stripSqlComments(sql)
  const tables: SchemaTable[] = []

  for (const statement of cleaned.split(';')) {
    const head = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i.exec(statement)
    if (!head) continue
    const at = head.index + head[0].length
    const table = takeIdentifier(statement.slice(at))
    if (table.name === '') continue
    const open = statement.indexOf('(', at + table.end)
    if (open < 0) continue

    const fields: SchemaField[] = []
    for (const part of splitTopLevel(parenBody(statement, open))) {
      if (TABLE_CONSTRAINT.test(part)) {
        applyTableConstraint(fields, part)
        continue
      }
      const field = parseColumnDefinition(part)
      if (field) fields.push(field)
    }
    tables.push({ name: table.name, fields })
  }

  if (tables.length === 0) {
    throw new SchemaDiffError('解析失败：没有找到 CREATE TABLE 语句，请粘贴建表 DDL')
  }
  return tables
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/** JSON 里可能包了一层 `{"tables": {...}}` 外壳，允许一次性下钻 */
const SHELL_KEYS = new Set(['tables', 'schemas', 'definitions', 'models', 'entities'])

/** 由 JSON 解析 Schema */
export function parseJsonSchema(text: string): readonly SchemaTable[] {
  let root: unknown
  try {
    root = JSON.parse(text)
  } catch {
    throw new SchemaDiffError('解析失败：输入不是合法的 JSON')
  }

  const record = unwrap(root)
  // JSON Schema 形态：整个文档描述一张表（顶层有 properties）
  if (record.properties !== null && typeof record.properties === 'object') {
    const name = typeof record.title === 'string' && record.title !== '' ? record.title : 'root'
    return [{ name, fields: applyRequired(fieldsOf(record, name), record.required) }]
  }

  const tables: SchemaTable[] = []
  for (const [tableName, rawTable] of Object.entries(record)) {
    if (SHELL_KEYS.has(tableName.toLowerCase())) continue
    const name = String(tableName)
    tables.push({ name, fields: fieldsOf(rawTable, name) })
  }
  if (tables.length === 0) {
    throw new SchemaDiffError('解析失败：JSON 里没有任何表定义')
  }
  return tables
}

/** 剥壳并归一：数组形态 `[{name, columns}]` 也转成「表名 → 字段容器」 */
function unwrap(root: unknown): Record<string, unknown> {
  if (Array.isArray(root)) {
    const out: Record<string, unknown> = {}
    for (const item of root) {
      const record = (item ?? {}) as Record<string, unknown>
      const name = typeof record.name === 'string' ? record.name : ''
      if (name === '') throw new SchemaDiffError('解析失败：数组形态的 Schema 每项都要有 name')
      out[name] =
        typeof record.columns === 'object' && record.columns !== null ? record.columns : {}
    }
    return out
  }
  let current = root
  if (current !== null && typeof current === 'object') {
    const keys = Object.keys(current as Record<string, unknown>)
    if (keys.length > 0 && keys.every((key) => SHELL_KEYS.has(key.toLowerCase()))) {
      current = (current as Record<string, unknown>)[keys[0] ?? '']
    }
  }
  if (current === null || typeof current !== 'object') {
    throw new SchemaDiffError('解析失败：Schema 的顶层必须是对象')
  }
  return current as Record<string, unknown>
}

/** JSON Schema 的 `required: [...]` 等价于这些字段不可为空，回填到字段上再比 */
function applyRequired(fields: readonly SchemaField[], required: unknown): readonly SchemaField[] {
  if (!Array.isArray(required)) return fields
  const names = new Set(required.map((item) => String(item)))
  return fields.map((field) => (names.has(field.name) ? { ...field, nullable: 'false' } : field))
}

/** 取出一张表的字段列表：兼容 `{"columns":{...}}`、JSON Schema 的 `properties` 与列字典 */
function fieldsOf(rawTable: unknown, tableName: string): readonly SchemaField[] {
  let source = rawTable
  if (source !== null && typeof source === 'object' && !Array.isArray(source)) {
    const record = source as Record<string, unknown>
    if (record.properties !== undefined && typeof record.properties === 'object') {
      source = record.properties
    } else if (record.columns !== undefined && typeof record.columns === 'object') {
      source = record.columns
    }
  }
  if (Array.isArray(source)) {
    return source.map((item, index) => {
      if (typeof item === 'string') return makeField(item, '')
      const record = (item ?? {}) as Record<string, unknown>
      const name =
        typeof record.name === 'string' && record.name !== '' ? record.name : String(index)
      return fieldFromObject(name, record, tableName)
    })
  }
  if (source === null || typeof source !== 'object') {
    throw new SchemaDiffError(`解析失败：表 ${tableName} 的字段定义既不是对象也不是数组`)
  }
  const fields: SchemaField[] = []
  for (const [columnName, rawColumn] of Object.entries(source as Record<string, unknown>)) {
    fields.push(fieldFromObject(columnName, rawColumn, tableName))
  }
  if (fields.length === 0) {
    throw new SchemaDiffError(`解析失败：表 ${tableName} 没有任何字段`)
  }
  return fields
}

/** 单个字段：对象形态读各约束键，字符串形态当作类型表达式，其余形态报错 */
function fieldFromObject(columnName: string, raw: unknown, tableName: string): SchemaField {
  if (typeof raw === 'string') {
    const inferred = parseColumnDefinition(`${columnName} ${raw}`)
    return inferred ?? makeField(columnName, raw)
  }
  if (raw !== null && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    const type = firstString(record, ['type', 'dataType', 'data_type', 'typeName'])
    if (type === '') {
      throw new SchemaDiffError(`解析失败：字段 ${tableName}.${columnName} 缺少 type`)
    }
    return makeField(columnName, type, {
      nullable: triFlag(record),
      primaryKey: boolish(record, ['primaryKey', 'primary_key', 'primary', 'pk', 'isPrimary']),
      unique: boolish(record, ['unique', 'isUnique']),
      autoIncrement: boolish(record, ['autoIncrement', 'auto_increment', 'increment', 'serial']),
      defaultValue: stringish(record, ['default', 'defaultValue', 'default_value']),
      comment: stringish(record, ['comment', 'description', 'desc', 'title']),
    })
  }
  throw new SchemaDiffError(`解析失败：字段 ${tableName}.${columnName} 的定义无法识别`)
}

/** 从若干候选键里取第一个非空字符串 */
function firstString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value !== '') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  }
  return ''
}

/** 布尔型属性：值可能是 true/false，也可能是 'YES'/'NO' */
function boolish(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (value === undefined) continue
    if (typeof value === 'boolean') return String(value)
    const text = String(value).trim().toLowerCase()
    if (text === '') continue
    if (['true', 'yes', 'y', '1'].includes(text)) return 'true'
    if (['false', 'no', 'n', '0'].includes(text)) return 'false'
  }
  return ''
}

/**
 * 可空标记要反着读：information_schema 的 `nullable=true` 表示可空，
 * 而 ORM 常见写法是 `notNull` / `required`，两者语义相反，必须分别处理。
 */
function triFlag(record: Record<string, unknown>): string {
  for (const key of ['nullable', 'null']) {
    const value = record[key]
    if (value === undefined) continue
    if (typeof value === 'boolean') return String(value)
    const text = String(value).trim().toLowerCase()
    if (text === 'yes' || text === 'true') return 'true'
    if (text === 'no' || text === 'false') return 'false'
  }
  for (const key of ['notNull', 'not_null', 'required']) {
    const value = record[key]
    if (value === undefined) continue
    if (typeof value === 'boolean') return String(!value)
    const text = String(value).trim().toLowerCase()
    if (text === 'yes' || text === 'true') return 'false'
    if (text === 'no' || text === 'false') return 'true'
  }
  return ''
}

/** 取字符串属性 */
function stringish(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  }
  return ''
}

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

/** 判断一段文本是 SQL DDL 还是 JSON：只按是否出现 CREATE TABLE 判定 */
export function detectSchemaKind(text: string): 'sql' | 'json' {
  return /create\s+table/i.test(text) ? 'sql' : 'json'
}

/** 按检测到的形态解析；空串得到空 Schema（便于「一边全空」的整增 / 整删对比） */
export function parseSchema(text: string): readonly SchemaTable[] {
  if (text.trim() === '') return []
  return detectSchemaKind(text) === 'sql' ? parseSqlSchema(text) : parseJsonSchema(text)
}

/** 一处字段属性变更 */
export interface FieldChange {
  readonly table: string
  readonly field: string
  readonly prop: ComparedProp
  readonly from: string
  readonly to: string
}

/** 完整 diff 结果 */
export interface SchemaDiff {
  readonly addedTables: readonly SchemaTable[]
  readonly removedTables: readonly SchemaTable[]
  readonly addedFields: readonly SchemaField[]
  readonly removedFields: readonly SchemaField[]
  readonly changes: readonly FieldChange[]
}

/** 比较取值：ignoreCase 时统一转小写，避免只差大小写被算成变更 */
function normalize(value: string, prop: ComparedProp, ignoreCase: boolean): string {
  return ignoreCase && prop === 'type' ? value.trim().toLowerCase() : value.trim()
}

/** 对比两份 Schema */
export function diffSchemas(
  before: readonly SchemaTable[],
  after: readonly SchemaTable[],
  options: SchemaDiffOptions,
): SchemaDiff {
  const beforeMap = new Map(before.map((table) => [table.name, table]))
  const afterMap = new Map(after.map((table) => [table.name, table]))

  const addedTables = after.filter((table) => !beforeMap.has(table.name))
  const removedTables = before.filter((table) => !afterMap.has(table.name))

  const addedFields: SchemaField[] = []
  const removedFields: SchemaField[] = []
  const changes: FieldChange[] = []

  for (const table of after) {
    const old = beforeMap.get(table.name)
    if (!old) continue
    const oldFields = new Map(old.fields.map((field) => [field.name, field]))
    const newFields = new Map(table.fields.map((field) => [field.name, field]))

    for (const field of table.fields) {
      const previous = oldFields.get(field.name)
      if (!previous) {
        addedFields.push({ ...field, name: `${table.name}.${field.name}` })
        continue
      }
      for (const prop of COMPARED_PROPS) {
        const from = normalize(previous[prop], prop, options.ignoreCase)
        const to = normalize(field[prop], prop, options.ignoreCase)
        // 两侧都没声明时不算变更，避免在一堆空值上刷差异
        if (from === to || (from === '' && to === '')) continue
        changes.push({ table: table.name, field: field.name, prop, from, to })
      }
    }

    for (const field of old.fields) {
      if (!newFields.has(field.name)) {
        removedFields.push({ ...field, name: `${table.name}.${field.name}` })
      }
    }
  }

  return { addedTables, removedTables, addedFields, removedFields, changes }
}

/** 是否「完全一致」：只有总和都不含变更才算 */
function identical(diff: SchemaDiff): boolean {
  return (
    diff.addedTables.length === 0 &&
    diff.removedTables.length === 0 &&
    diff.addedFields.length === 0 &&
    diff.removedFields.length === 0 &&
    diff.changes.length === 0
  )
}

/** 汇总一行 */
export function summaryLine(diff: SchemaDiff): string {
  return [
    `新增表 ${diff.addedTables.length}`,
    `删除表 ${diff.removedTables.length}`,
    `新增字段 ${diff.addedFields.length}`,
    `删除字段 ${diff.removedFields.length}`,
    `字段变更 ${diff.changes.length}`,
  ].join(' · ')
}

/** 空串在报告里写成（空），否则「未声明 → false」看不出变化方向 */
function quote(value: string): string {
  return value === '' ? '（空）' : value
}

/** 可读报告：按「新增/删除/变更」分段 */
export function formatReport(diff: SchemaDiff): string {
  const blocks: string[] = ['== 汇总 ==', summaryLine(diff)]

  const section = (title: string, lines: readonly string[]): void => {
    if (lines.length === 0) return
    blocks.push(['', `== ${title} ==`, ...lines].join('\n'))
  }

  section(
    '新增表',
    diff.addedTables.map((table) => `+ ${table.name}`),
  )
  section(
    '删除表',
    diff.removedTables.map((table) => `- ${table.name}`),
  )
  section(
    '新增字段',
    diff.addedFields.map((field) => `+ ${field.name}  ${field.type}`),
  )
  section(
    '删除字段',
    diff.removedFields.map((field) => `- ${field.name}  ${field.type}`),
  )
  section(
    '字段变更',
    diff.changes.map(
      (change) =>
        `~ ${change.table}.${change.field}  ${PROP_LABEL[change.prop]}: ` +
        `${quote(change.from)} → ${quote(change.to)}`,
    ),
  )
  if (identical(diff)) blocks.push('', '两份 Schema 完全一致。')

  return blocks.join('\n')
}

/** Markdown：便于直接贴进 PR 描述 */
export function formatMarkdown(diff: SchemaDiff): string {
  const lines: string[] = ['# Schema Diff', '', summaryLine(diff)]

  const rowsBlock = (title: string, rows: readonly string[]): void => {
    if (rows.length === 0) return
    lines.push('', `## ${title}`, '', '| 字段 | 类型 |', '| --- | --- |', ...rows)
  }

  rowsBlock(
    '新增字段',
    diff.addedFields.map((field) => `| ${field.name} | ${field.type} |`),
  )
  rowsBlock(
    '删除字段',
    diff.removedFields.map((field) => `| ${field.name} | ${field.type} |`),
  )

  if (diff.changes.length > 0) {
    lines.push(
      '',
      '## 字段变更',
      '',
      '| 字段 | 属性 | 旧值 | 新值 |',
      '| --- | --- | --- | --- |',
      ...diff.changes.map(
        (change) =>
          `| ${change.table}.${change.field} | ${PROP_LABEL[change.prop]} | ` +
          `${quote(change.from)} | ${quote(change.to)} |`,
      ),
    )
  }
  if (diff.addedTables.length > 0) {
    lines.push('', `新增表：${diff.addedTables.map((table) => table.name).join('、')}`)
  }
  if (diff.removedTables.length > 0) {
    lines.push('', `删除表：${diff.removedTables.map((table) => table.name).join('、')}`)
  }
  if (identical(diff)) lines.push('', '两份 Schema 完全一致。')

  return lines.join('\n')
}

/** JSON 结果 */
export function formatJson(diff: SchemaDiff): string {
  return JSON.stringify(
    {
      summary: summaryLine(diff),
      addedTables: diff.addedTables.map((table) => table.name),
      removedTables: diff.removedTables.map((table) => table.name),
      addedFields: diff.addedFields.map((field) => ({ field: field.name, type: field.type })),
      removedFields: diff.removedFields.map((field) => ({ field: field.name, type: field.type })),
      changes: diff.changes.map((change) => ({
        field: `${change.table}.${change.field}`,
        property: change.prop,
        from: change.from,
        to: change.to,
      })),
    },
    null,
    2,
  )
}

/**
 * Schema Diff —— 纯函数，不依赖 React / DOM，可独立单测。
 * 两侧都为空返回空串；超长输入按此项目的统一口径抛错。
 */
export function transform(input: SchemaDiffInput, options: SchemaDiffOptions): string {
  const before = input.text.trim()
  const after = input.schemaB.trim()
  if (before === '' && after === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new SchemaDiffError('旧 Schema 超过 100,000 字符上限')
  }
  if (input.schemaB.length > MAX_INPUT) {
    throw new SchemaDiffError('新 Schema 超过 100,000 字符上限')
  }
  if (before !== '' && after !== '' && detectSchemaKind(before) !== detectSchemaKind(after)) {
    throw new SchemaDiffError('两侧格式不一致：一边是 SQL DDL、另一边是 JSON，请先统一格式')
  }

  const diff = diffSchemas(parseSchema(before), parseSchema(after), options)
  if (options.format === 'json') return formatJson(diff)
  if (options.format === 'markdown') return formatMarkdown(diff)
  return formatReport(diff)
}
