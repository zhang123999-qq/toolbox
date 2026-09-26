import { parseCreateTables, type Column, type Table } from '../../lib/sql-ddl'
import type { SqlToOrmInput, SqlToOrmOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class SqlToOrmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SqlToOrmError'
  }
}

const MAX_INPUT = 200_000

/**
 * 建表解析已上提到 lib/sql-ddl（与 SQL 转 JSON Schema、ER 图共用）。
 * 这里保留旧导出名，避免破坏本工具测试与既有调用。
 */
export const parseTables = parseCreateTables

/** 常见复数 → 单数（users → user），用于模型命名 */
function singularize(word: string): string {
  const lower = word.toLowerCase()
  if (lower.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (['ses', 'xes', 'ches', 'shes'].some((suffix) => lower.endsWith(suffix))) {
    return word.slice(0, -2)
  }
  if (lower.endsWith('s') && !lower.endsWith('ss')) return word.slice(0, -1)
  return word
}

function tokenize(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((token) => token !== '')
    .map((token) => token.toLowerCase())
}

function pascal(text: string): string {
  return tokenize(singularize(text))
    .map((word) => (word === '' ? '' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('')
}

function camel(text: string): string {
  const words = tokenize(text)
  if (words.length === 0) return 'field'
  return (
    words[0] +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  )
}

/* ----------------------------- Sequelize ----------------------------- */

function sequelizeType(col: Column): string {
  switch (col.sqlType) {
    case 'TINYINT':
    case 'SMALLINT':
    case 'MEDIUMINT':
      return `DataTypes.${col.sqlType}`
    case 'INT':
    case 'INTEGER':
      return 'DataTypes.INTEGER'
    case 'BIGINT':
      return 'DataTypes.BIGINT'
    case 'DECIMAL':
    case 'NUMERIC':
      return col.precision !== undefined
        ? `DataTypes.DECIMAL(${col.precision}${col.scale !== undefined ? `, ${col.scale}` : ''})`
        : 'DataTypes.DECIMAL'
    case 'FLOAT':
      return 'DataTypes.FLOAT'
    case 'DOUBLE':
    case 'REAL':
      return 'DataTypes.DOUBLE'
    case 'BOOLEAN':
    case 'BOOL':
      return 'DataTypes.BOOLEAN'
    case 'DATE':
    case 'DATETIME':
    case 'TIMESTAMP':
      return 'DataTypes.DATE'
    case 'TIME':
      return 'DataTypes.TIME'
    case 'TEXT':
    case 'TINYTEXT':
    case 'MEDIUMTEXT':
    case 'LONGTEXT':
      return 'DataTypes.TEXT'
    case 'BLOB':
    case 'BINARY':
    case 'VARBINARY':
    case 'LONGBLOB':
      return 'DataTypes.BLOB'
    case 'UUID':
      return 'DataTypes.UUID'
    case 'JSON':
    case 'JSONB':
      return 'DataTypes.JSON'
    case 'VARCHAR':
    case 'CHAR':
    case 'STRING':
      return col.length !== undefined ? `DataTypes.STRING(${col.length})` : 'DataTypes.STRING'
    default:
      return 'DataTypes.STRING'
  }
}

function formatDefaultSequelize(col: Column): string {
  const value = col.defaultValue
  if (value === undefined) return ''
  if (/^CURRENT_TIMESTAMP$/i.test(value)) return 'default: DataTypes.NOW'
  if (/^NULL$/i.test(value)) return 'default: null'
  return `default: ${value}`
}

function renderSequelize(table: Table): string {
  const model = pascal(table.name) || 'Model'
  const lines: string[] = [`const ${model} = sequelize.define('${table.name}', {`]
  table.columns.forEach((col, index) => {
    const facets: string[] = [`type: ${sequelizeType(col)}`]
    if (col.primaryKey) facets.push('primaryKey: true')
    if (col.autoIncrement) facets.push('autoIncrement: true')
    facets.push(`allowNull: ${col.nullable}`)
    if (col.unique) facets.push('unique: true')
    const def = formatDefaultSequelize(col)
    if (def !== '') facets.push(def)
    const tail = index === table.columns.length - 1 ? '' : ','
    lines.push(`  ${col.name}: { ${facets.join(', ')} }${tail}`)
  })
  lines.push(`}, { tableName: '${table.name}', timestamps: false });`)
  return lines.join('\n')
}

/* ------------------------------ TypeORM ------------------------------ */

function typeOrmType(col: Column): string {
  switch (col.sqlType) {
    case 'TINYINT':
    case 'SMALLINT':
    case 'INT':
    case 'INTEGER':
    case 'MEDIUMINT':
      return 'int'
    case 'BIGINT':
      return 'bigint'
    case 'DECIMAL':
    case 'NUMERIC':
      return 'decimal'
    case 'FLOAT':
    case 'REAL':
      return 'float'
    case 'DOUBLE':
      return 'double'
    case 'BOOLEAN':
    case 'BOOL':
      return 'boolean'
    case 'DATE':
    case 'DATETIME':
    case 'TIMESTAMP':
      return 'datetime'
    case 'TIME':
      return 'time'
    case 'TEXT':
    case 'TINYTEXT':
    case 'MEDIUMTEXT':
    case 'LONGTEXT':
      return 'text'
    case 'BLOB':
    case 'BINARY':
    case 'VARBINARY':
    case 'LONGBLOB':
      return 'blob'
    case 'UUID':
      return 'uuid'
    case 'JSON':
    case 'JSONB':
      return 'json'
    case 'CHAR':
      return 'char'
    case 'VARCHAR':
    case 'STRING':
    default:
      return 'varchar'
  }
}

function tsType(col: Column): string {
  switch (typeOrmType(col)) {
    case 'int':
    case 'bigint':
    case 'decimal':
    case 'float':
    case 'double':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'datetime':
    case 'time':
      return 'Date'
    case 'json':
      return 'Record<string, unknown>'
    default:
      return 'string'
  }
}

function renderTypeOrm(table: Table): string {
  const model = pascal(table.name) || 'Entity'
  const lines: string[] = [`@Entity('${table.name}')`, `export class ${model} {`]
  for (const col of table.columns) {
    const field = camel(col.name)
    if (col.primaryKey && col.autoIncrement) {
      lines.push('  @PrimaryGeneratedColumn()')
    } else if (col.primaryKey) {
      lines.push(`  @PrimaryColumn({ name: '${col.name}', type: '${typeOrmType(col)}' })`)
    } else {
      const facets: string[] = [`name: '${col.name}'`, `type: '${typeOrmType(col)}'`]
      if (col.length !== undefined) facets.push(`length: ${col.length}`)
      facets.push(`nullable: ${col.nullable}`)
      if (col.unique) facets.push('unique: true')
      lines.push(`  @Column({ ${facets.join(', ')} })`)
    }
    lines.push(`  ${field}${col.nullable ? '?' : ''}: ${tsType(col)};`)
    lines.push('')
  }
  if (lines[lines.length - 1] === '') lines.pop()
  lines.push('}')
  return lines.join('\n')
}

/**
 * CREATE TABLE 转 ORM 模型。
 * 空输入返回空串；解析不到任何建表语句抛 SqlToOrmError。
 */
export function transform(input: SqlToOrmInput, options: SqlToOrmOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new SqlToOrmError('输入超过 200,000 字符上限')
  }

  const tables = parseTables(input.text)
  if (tables.length === 0) {
    throw new SqlToOrmError('没有解析到任何 CREATE TABLE 语句')
  }

  const render = options.target === 'sequelize' ? renderSequelize : renderTypeOrm
  return tables.map(render).join('\n\n')
}
