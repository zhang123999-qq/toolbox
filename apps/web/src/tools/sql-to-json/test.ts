import { describe, expect, it } from 'vitest'
import { buildSchema, mapColumnType, tableToSchema, transform } from './utils'
import { parseCreateTables } from '../../lib/sql-ddl'
import type { SqlToJsonInput } from './schema'

const input = (text: string): SqlToJsonInput => ({ text })

type Column = ReturnType<typeof parseCreateTables>[number]['columns'][number]
const col = (partial: Partial<Column> & Pick<Column, 'sqlType'>): Column =>
  ({
    name: 'c',
    length: undefined,
    precision: undefined,
    scale: undefined,
    nullable: true,
    primaryKey: false,
    autoIncrement: false,
    unique: false,
    defaultValue: undefined,
    unsigned: false,
    ...partial,
  }) as Column

const DDL = `CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  age INT,
  score DECIMAL(10,2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  data JSON,
  avatar BLOB
);`

describe('sql-to-json / mapColumnType', () => {
  it('数值 / 布尔 / 时间 / JSON / 二进制映射', () => {
    expect(mapColumnType(col({ sqlType: 'BIGINT' }))).toEqual({ type: 'integer' })
    expect(mapColumnType(col({ sqlType: 'DECIMAL', precision: 10, scale: 2 }))).toEqual({
      type: 'number',
      'x-precision': 10,
      'x-scale': 2,
    })
    expect(mapColumnType(col({ sqlType: 'BOOLEAN' }))).toEqual({ type: 'boolean' })
    expect(mapColumnType(col({ sqlType: 'TIMESTAMP' }))).toEqual({
      type: 'string',
      format: 'date-time',
    })
    expect(mapColumnType(col({ sqlType: 'JSONB' }))).toEqual({})
    expect(mapColumnType(col({ sqlType: 'BLOB' }))).toEqual({
      type: 'string',
      contentEncoding: 'base64',
    })
  })

  it('VARCHAR 带长度 → maxLength', () => {
    expect(mapColumnType(col({ sqlType: 'VARCHAR', length: 255 }))).toEqual({
      type: 'string',
      maxLength: 255,
    })
  })
})

describe('sql-to-json / 完整转换', () => {
  it('生成 draft 2020-12，列进 properties、NOT NULL 进 required', () => {
    const schema = JSON.parse(transform(input(DDL), {}))
    expect(schema.$schema).toContain('2020-12')
    const user = schema.$defs.users
    expect(user.properties.id).toMatchObject({ type: 'integer', 'x-primary-key': true })
    expect(user.properties.email).toMatchObject({
      type: 'string',
      maxLength: 255,
      'x-unique': true,
    })
    expect(user.properties.age).toEqual({ type: 'integer' })
    expect(user.properties.active.default).toBe(true)
    expect(user.required).toContain('email')
    expect(user.required).not.toContain('age')
  })

  it('多张表收进 $defs', () => {
    const out = transform(
      input('CREATE TABLE a (id INT PRIMARY KEY); CREATE TABLE b (id INT PRIMARY KEY);'),
      {},
    )
    const schema = JSON.parse(out)
    expect(Object.keys(schema.$defs).sort()).toEqual(['a', 'b'])
  })

  it('tableToSchema 与 buildSchema 可独立调用', () => {
    const tables = parseCreateTables(DDL)
    const schema = tableToSchema(tables[0])
    expect(schema.title).toBe('users')
    const built = buildSchema(tables) as { $defs: Record<string, { title: string }> }
    expect(built.$defs.users.title).toBe('users')
  })

  it('空输入返回空串；无建表语句 / 超长抛错（边界 / 异常）', () => {
    expect(transform(input('   '), {})).toBe('')
    expect(() => transform(input('SELECT 1;'), {})).toThrow()
    expect(() => transform(input('x'.repeat(200_001)), {})).toThrow()
  })
})
