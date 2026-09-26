import { parseCreateTables } from '../../lib/sql-ddl'
import type { SqlToJsonInput, SqlToJsonOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class SqlToJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SqlToJsonError'
  }
}

const MAX_INPUT = 200_000

type ParsedTable = ReturnType<typeof parseCreateTables>[number]
type ParsedColumn = ParsedTable['columns'][number]

type JsonSchema = Record<string, unknown>

/** SQL 列类型 → JSON Schema 片段 */
export function mapColumnType(column: ParsedColumn): JsonSchema {
  const t = column.sqlType.toUpperCase()

  if (/^(INT|INTEGER|BIGINT|SMALLINT|TINYINT|MEDIUMINT|SERIAL|BIGSERIAL)$/.test(t)) {
    return { type: 'integer' }
  }
  if (/^(FLOAT|DOUBLE|REAL|DECIMAL|NUMERIC|NUMBER)$/.test(t)) {
    const schema: JsonSchema = { type: 'number' }
    if (column.precision !== undefined) schema['x-precision'] = column.precision
    if (column.scale !== undefined) schema['x-scale'] = column.scale
    return schema
  }
  if (/^(BOOL|BOOLEAN)$/.test(t)) return { type: 'boolean' }
  if (/^(DATE)$/.test(t)) return { type: 'string', format: 'date' }
  if (/^(DATETIME|TIMESTAMP|TIMESTAMPTZ|TIMETZ)$/.test(t)) {
    return { type: 'string', format: 'date-time' }
  }
  if (/^(TIME)$/.test(t)) return { type: 'string', format: 'time' }
  if (/^(UUID)$/.test(t)) return { type: 'string', format: 'uuid' }
  if (/^(JSON|JSONB)$/.test(t)) return {} // 结构不固定，用「任意类型」
  if (/^(BLOB|BYTEA|BINARY|VARBINARY|BIT)$/.test(t)) {
    return { type: 'string', contentEncoding: 'base64' }
  }
  // CHAR/VARCHAR/TEXT/CLOB/ENUM/… 默认字符串
  const schema: JsonSchema = { type: 'string' }
  if (column.length !== undefined) schema.maxLength = column.length
  if (/^(ENUM|SET)$/.test(t)) schema['x-sql-type'] = t
  return schema
}

/** DEFAULT 字面量 → JS 值（数字 / 布尔 / null / 字符串），无法判定时省略 */
function defaultLiteral(raw: string | undefined): unknown {
  if (raw === undefined) return undefined
  const value = raw.trim().replace(/;$/, '')
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^-?\d*\.\d+$/.test(value)) return Number(value)
  if (/^(TRUE|FALSE)$/i.test(value)) return value.toUpperCase() === 'TRUE'
  if (/^NULL$/i.test(value)) return null
  const str = /^'(.*)'$/s.exec(value)?.[1]
  if (str !== undefined) return str.replace(/''/g, "'")
  // CURRENT_TIMESTAMP / 函数表达式等无法静态表达，省略 default
  return undefined
}

/** 单张表 → JSON Schema 定义 */
export function tableToSchema(table: ParsedTable): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []

  for (const column of table.columns) {
    const schema = mapColumnType(column)
    const fallback = defaultLiteral(column.defaultValue)
    if (fallback !== undefined) schema.default = fallback
    if (column.primaryKey) schema['x-primary-key'] = true
    if (column.autoIncrement) schema['x-auto-increment'] = true
    if (column.unique) schema['x-unique'] = true
    properties[column.name] = schema
    if (!column.nullable) required.push(column.name)
  }

  const out: JsonSchema = {
    type: 'object',
    title: table.name,
    properties,
  }
  if (required.length > 0) out.required = required
  return out
}

/** 多条 CREATE TABLE → 一份带 $defs 的 JSON Schema（draft 2020-12） */
export function buildSchema(tables: readonly ParsedTable[]): JsonSchema {
  const defs: Record<string, JsonSchema> = {}
  for (const table of tables) defs[table.name] = tableToSchema(table)
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: tables.length === 1 ? tables[0].name : 'Database schema',
    $defs: defs,
  }
}

/** 输入建表 DDL → JSON Schema 文本 */
export function transform(input: SqlToJsonInput, _options: SqlToJsonOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new SqlToJsonError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  const tables = parseCreateTables(input.text)
  if (tables.length === 0) {
    throw new SqlToJsonError('没有识别到任何 CREATE TABLE 建表语句')
  }
  return JSON.stringify(buildSchema(tables), null, 2)
}
