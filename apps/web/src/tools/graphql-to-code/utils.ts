import type { GraphqlToCodeInput, GraphqlToCodeOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class GraphqlToCodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GraphqlToCodeError'
  }
}

const MAX_INPUT = 200_000

/** 内置标量 → TS 类型；其余（自定义标量 / 对象）一律 unknown */
const SCALARS: Record<string, string> = {
  String: 'string',
  ID: 'string',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
}

/** 选择集里的一个字段：selection 为 null 表示叶子字段 */
export interface GqlField {
  readonly name: string
  readonly selection: readonly GqlField[] | null
}

/** 操作声明的变量 */
export interface GqlVariable {
  readonly name: string
  readonly type: string
  readonly hasDefault: boolean
}

/** 一个顶层操作（query / mutation / subscription） */
export interface GqlOperation {
  readonly kind: 'query' | 'mutation' | 'subscription'
  readonly name: string | null
  readonly variables: readonly GqlVariable[]
  readonly selection: readonly GqlField[]
}

/**
 * 只读游标：GraphQL 里逗号、空白、注释都是「无关字符」，
 * 统一在这里跳过，解析函数只面对有意义的 token。
 */
class Cursor {
  private pos = 0

  constructor(private readonly src: string) {}

  /** 跳过空白 / 逗号 / BOM / `#` 注释 */
  skip(): void {
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos] as string
      if (ch === '\uFEFF' || ch === ',' || /\s/.test(ch)) {
        this.pos += 1
        continue
      }
      if (ch === '#') {
        const newline = this.src.indexOf('\n', this.pos)
        this.pos = newline === -1 ? this.src.length : newline + 1
        continue
      }
      break
    }
  }

  eof(): boolean {
    this.skip()
    return this.pos >= this.src.length
  }

  peek(): string {
    this.skip()
    return this.src.slice(this.pos, this.pos + 1)
  }

  /** 吃掉一个数值字面量（默认值里的 10 / -1 / 1.5e3） */
  skipNumber(): void {
    this.skip()
    const match = /^-?[0-9][0-9eE+\-.]*/.exec(this.src.slice(this.pos))
    if (!match) {
      throw new GraphqlToCodeError(
        `期望一个数值，实际读到“${this.src.slice(this.pos, this.pos + 12)}”`,
      )
    }
    this.pos += match[0].length
  }

  /** 读取一个 Name：GraphQL 规范的字母数字下划线标识符 */
  readName(): string {
    this.skip()
    const match = /^[_A-Za-z][_0-9A-Za-z]*/.exec(this.src.slice(this.pos))
    if (!match) {
      throw new GraphqlToCodeError(
        `期望一个名称，实际读到“${this.src.slice(this.pos, this.pos + 12)}”`,
      )
    }
    this.pos += match[0].length
    return match[0]
  }

  expect(token: string): void {
    this.skip()
    if (!this.src.startsWith(token, this.pos)) {
      throw new GraphqlToCodeError(
        `期望“${token}”，实际读到“${this.src.slice(this.pos, this.pos + 12)}”`,
      )
    }
    this.pos += token.length
  }

  /** 成对括号整体跳过；内部遇到字符串先吃掉字符串，避免引号里的括号干扰计数 */
  skipBalanced(open: string, close: string): void {
    this.expect(open)
    let depth = 1
    while (depth > 0) {
      if (this.pos >= this.src.length) throw new GraphqlToCodeError('括号没有闭合')
      const ch = this.src[this.pos] as string
      if (ch === '"') {
        this.skipString()
        continue
      }
      if (ch === open) depth += 1
      else if (ch === close) depth -= 1
      this.pos += 1
    }
  }

  /** 吃掉一个字符串字面量（含三引号形式） */
  skipString(): void {
    const triple = this.src.startsWith('"""', this.pos)
    const quote = triple ? '"""' : '"'
    this.pos += quote.length
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos] as string
      if (ch === '\\' && !triple) {
        this.pos += 2
        continue
      }
      if (this.src.startsWith(quote, this.pos)) {
        this.pos += quote.length
        return
      }
      this.pos += 1
    }
    throw new GraphqlToCodeError('字符串没有闭合')
  }
}

/** 读取类型引用：`[Int!]!` / `String` / `ID!` */
function readType(cursor: Cursor): string {
  if (cursor.peek() === '[') {
    cursor.expect('[')
    const inner = readType(cursor)
    cursor.expect(']')
    const bang = cursor.peek() === '!'
    if (bang) cursor.expect('!')
    return `[${inner}]${bang ? '!' : ''}`
  }
  const name = cursor.readName()
  const bang = cursor.peek() === '!'
  if (bang) cursor.expect('!')
  return name + (bang ? '!' : '')
}

/** 跳过 `@foo(...)` 形式的指令 */
function skipDirectives(cursor: Cursor): void {
  while (cursor.peek() === '@') {
    cursor.expect('@')
    cursor.readName()
    if (cursor.peek() === '(') cursor.skipBalanced('(', ')')
  }
}

/**
 * 解析变量定义 `(id: ID!, $first: Int = 10)`。
 * 默认值只关心「有没有」——它决定该变量在 TS 里是否可选。
 */
function parseVariableDefinitions(cursor: Cursor): readonly GqlVariable[] {
  cursor.expect('(')
  const variables: GqlVariable[] = []
  while (cursor.peek() !== ')') {
    cursor.expect('$')
    const name = cursor.readName()
    cursor.expect(':')
    const type = readType(cursor)
    let hasDefault = false
    if (cursor.peek() === '=') {
      cursor.expect('=')
      skipValue(cursor)
      hasDefault = true
    }
    skipDirectives(cursor)
    variables.push({ name, type, hasDefault })
  }
  cursor.expect(')')
  return variables
}

/** 跳过一个默认值（数字 / 字符串 / 枚举 / 列表 / 对象 / 布尔） */
function skipValue(cursor: Cursor): void {
  const ch = cursor.peek()
  if (/[-0-9.]/.test(ch)) {
    cursor.skipNumber()
    return
  }
  if (ch === '[') {
    cursor.skipBalanced('[', ']')
    return
  }
  if (ch === '{') {
    cursor.skipBalanced('{', '}')
    return
  }
  if (ch === '"') {
    cursor.skipString()
    return
  }
  cursor.readName()
}

/**
 * 解析选择集。
 * 内联片段 `... on Type {}` 的字段并入父对象（无 Schema 时这是最贴近实际的近似）；
 * 片段展开 `...Fragment` 无法解析，记录告警后跳过。
 */
function parseSelectionSet(cursor: Cursor, warnings: string[]): readonly GqlField[] {
  cursor.expect('{')
  const fields: GqlField[] = []
  while (cursor.peek() !== '}') {
    if (cursor.peek() === '.') {
      cursor.expect('...')
      const next = cursor.readName()
      if (next === 'on') {
        cursor.readName()
        skipDirectives(cursor)
        fields.push(...parseSelectionSet(cursor, warnings))
        continue
      }
      skipDirectives(cursor)
      warnings.push(`忽略片段展开 ...${next}（本工具不支持 fragment）`)
      continue
    }
    const head = cursor.readName()
    // 别名 `me: user` —— 属性名用别名，真实字段名对类型生成没有影响
    if (cursor.peek() === ':') {
      cursor.expect(':')
      cursor.readName()
    }
    const name = head
    if (cursor.peek() === '(') cursor.skipBalanced('(', ')')
    skipDirectives(cursor)
    const selection = cursor.peek() === '{' ? parseSelectionSet(cursor, warnings) : null
    fields.push({ name, selection })
  }
  cursor.expect('}')
  return mergeFields(fields)
}

/** 同名字段合并（别名重复 / 内联片段叠加时会出现） */
function mergeFields(fields: readonly GqlField[]): readonly GqlField[] {
  const merged: GqlField[] = []
  const index = new Map<string, number>()
  for (const field of fields) {
    const at = index.get(field.name)
    if (at === undefined) {
      index.set(field.name, merged.length)
      merged.push(field)
      continue
    }
    const prev = merged[at] as GqlField
    merged[at] = {
      name: prev.name,
      selection:
        prev.selection && field.selection
          ? mergeFields([...prev.selection, ...field.selection])
          : (prev.selection ?? field.selection),
    }
  }
  return merged
}

/**
 * 解析整份文档：连续解析顶层定义，直到读完。
 * 简写查询 `{ foo }` 按 query 处理；`fragment` 定义跳过并告警。
 */
export function parseDocument(source: string): {
  readonly operations: readonly GqlOperation[]
  readonly warnings: readonly string[]
} {
  const cursor = new Cursor(source)
  const operations: GqlOperation[] = []
  const warnings: string[] = []

  while (!cursor.eof()) {
    if (cursor.peek() === '{') {
      operations.push({
        kind: 'query',
        name: null,
        variables: [],
        selection: parseSelectionSet(cursor, warnings),
      })
      continue
    }
    const head = cursor.readName()
    if (head === 'fragment') {
      const fragmentName = cursor.readName()
      cursor.readName() // on
      cursor.readName() // 类型条件
      skipDirectives(cursor)
      cursor.skipBalanced('{', '}')
      warnings.push(`忽略片段定义 fragment ${fragmentName}（本工具不支持 fragment）`)
      continue
    }
    if (head !== 'query' && head !== 'mutation' && head !== 'subscription') {
      throw new GraphqlToCodeError(
        `无法识别的顶层定义“${head}”（只支持 query / mutation / subscription）`,
      )
    }
    const kind = head
    let name: string | null = null
    if (cursor.peek() !== '(' && cursor.peek() !== '{' && cursor.peek() !== '@') {
      name = cursor.readName()
    }
    skipDirectives(cursor)
    const variables = cursor.peek() === '(' ? parseVariableDefinitions(cursor) : []
    skipDirectives(cursor)
    const selection = parseSelectionSet(cursor, warnings)
    operations.push({ kind, name, variables, selection })
  }

  if (operations.length === 0) {
    throw new GraphqlToCodeError('文档里没有可解析的操作')
  }
  return { operations, warnings }
}

/** GraphQL 类型 → TS 类型；strict 时才体现可空性 */
export function toTsType(type: string, strict: boolean): string {
  const nonNull = type.endsWith('!')
  const base = nonNull ? type.slice(0, -1) : type
  const ts = base.startsWith('[')
    ? `Array<${toTsType(base.slice(1, -1), strict)}>`
    : (SCALARS[base] ?? 'unknown')
  // 列表自身可空时也要带上 null：用括号避免 `T[] | null` 之外的歧义
  return !nonNull && strict ? `(${ts}) | null` : ts
}

/** 操作名 → 类型名：GetUser + Query；已是后缀则不重复追加 */
export function operationTypeName(operation: GqlOperation): string {
  const suffix =
    operation.kind === 'query'
      ? 'Query'
      : operation.kind === 'mutation'
        ? 'Mutation'
        : 'Subscription'
  if (!operation.name) return suffix
  const base = operation.name.replace(/[^A-Za-z0-9_]/g, '_')
  const pascal = base.slice(0, 1).toUpperCase() + base.slice(1)
  return pascal.endsWith(suffix) ? pascal : pascal + suffix
}

/** 属性名：合法标识符原样输出，否则加引号 */
function propertyKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : `'${name.replace(/'/g, "\\'")}'`
}

/** 递归渲染对象类型字面量；level 为花括号所在层级 */
function renderSelection(fields: readonly GqlField[], level: number): string {
  // 空选择集（例如只含被跳过的片段展开）直接渲染成 {}，避免输出一个空行
  if (fields.length === 0) return '{}'
  const pad = '  '.repeat(level)
  const lines = fields.map((field) =>
    field.selection
      ? `${pad}${propertyKey(field.name)}: ${renderSelection(field.selection, level + 1)}`
      : `${pad}${propertyKey(field.name)}: unknown`,
  )
  return ['{', ...lines, '  '.repeat(Math.max(0, level - 1)) + '}'].join('\n')
}

/** 变量接口：strict 关闭时一切皆可选，便于直接拿去构造 mock */
function renderVariables(operation: GqlOperation, strict: boolean): string {
  const lines = operation.variables.map((variable) => {
    const type = toTsType(variable.type, strict)
    const optional = variable.hasDefault || !strict ? '?' : ''
    return `  ${propertyKey(variable.name)}${optional}: ${type}`
  })
  return [`export interface ${operationTypeName(operation)}Variables {`, ...lines, '}'].join('\n')
}

/** 结果接口：无 Schema，叶子字段只能是 unknown */
function renderResult(operation: GqlOperation): string {
  const body = renderSelection(operation.selection, 1)
  return `export interface ${operationTypeName(operation)} ${body}`
}

/**
 * GraphQL 查询 → TypeScript 类型（纯函数）。
 * 无 Schema 是硬约束：叶子字段的具体标量、列表性、可空性都无法仅凭查询判定，
 * 因此叶子一律输出 unknown，并在头部注释里说明，让使用者自己补。
 */
export function transform(input: GraphqlToCodeInput, options: GraphqlToCodeOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new GraphqlToCodeError('输入超过 200,000 字符上限')
  }

  const { operations, warnings } = parseDocument(input.text)
  const header = [
    '// 由 graphql-to-code 生成（无 Schema：叶子字段类型推断为 unknown）',
    '// 列表性与可空性无法仅凭查询判定，请按实际 Schema 补全',
  ]
  for (const warning of warnings) header.push(`// ${warning}`)

  const blocks: string[] = []
  for (const operation of operations) {
    if (options.mode !== 'result') {
      blocks.push(
        operation.variables.length
          ? renderVariables(operation, options.strict)
          : `// ${operationTypeName(operation)} 未声明变量`,
      )
    }
    if (options.mode !== 'variables') blocks.push(renderResult(operation))
  }

  return [...header, '', ...blocks.join('\n\n').split('\n')].join('\n')
}
