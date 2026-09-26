import { describe, expect, it } from 'vitest'
import { SqlDialectError, detectDialect, tokenize, transform } from './utils'
import type { SqlDialectInput, SqlDialectOptions } from './schema'

const toPostgres: SqlDialectOptions = { source: 'mysql', target: 'postgres' }
const toMysql: SqlDialectOptions = { source: 'postgres', target: 'mysql' }

describe('sql-dialect / transform', () => {
  it('MySQL → PostgreSQL：自增转 SERIAL、反引号转双引号、DATETIME 转 TIMESTAMP', () => {
    const input: SqlDialectInput = {
      text: 'CREATE TABLE t (id INT NOT NULL AUTO_INCREMENT, `name` VARCHAR(64), birth DATETIME)',
    }
    expect(transform(input, toPostgres)).toBe(
      'CREATE TABLE t (id SERIAL, "name" VARCHAR(64), birth TIMESTAMP)',
    )
  })

  it('MySQL → PostgreSQL：LIMIT offset,size 转 LIMIT size OFFSET offset', () => {
    const input: SqlDialectInput = { text: 'SELECT id FROM t LIMIT 10, 5' }
    expect(transform(input, toPostgres)).toBe(
      ['SELECT id', 'FROM t', 'LIMIT 5', 'OFFSET 10'].join('\n'),
    )
  })

  it('MySQL → PostgreSQL：丢弃 ENGINE / CHARSET 表选项与 UNSIGNED', () => {
    const input: SqlDialectInput = {
      text: 'CREATE TABLE t (a INT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    }
    expect(transform(input, toPostgres)).toBe('CREATE TABLE t (a INT)')
  })

  it('PostgreSQL → MySQL：SERIAL 转 INT AUTO_INCREMENT、双引号转反引号', () => {
    const input: SqlDialectInput = { text: 'CREATE TABLE t (id SERIAL PRIMARY KEY, "name" TEXT)' }
    expect(transform(input, toMysql)).toBe(
      'CREATE TABLE t (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` TEXT)',
    )
  })

  it('PostgreSQL → MySQL：LIMIT size OFFSET offset 转 LIMIT offset,size', () => {
    const input: SqlDialectInput = { text: 'SELECT id FROM t LIMIT 5 OFFSET 10' }
    expect(transform(input, toMysql)).toBe(['SELECT id', 'FROM t', 'LIMIT 10, 5'].join('\n'))
  })

  it('PostgreSQL → MySQL：:: 强转改写为 CAST(x AS type)，JSONB 转 JSON', () => {
    const input: SqlDialectInput = { text: 'SELECT payload::text FROM t WHERE age > 1' }
    expect(transform(input, toMysql)).toContain('CAST(payload AS text)')
    const json: SqlDialectInput = { text: 'CREATE TABLE t (payload JSONB)' }
    expect(transform(json, toMysql)).toBe('CREATE TABLE t (payload JSON)')
  })

  it('MySQL 的 # 注释统一改写成 --', () => {
    const input: SqlDialectInput = { text: 'SELECT 1 # 备注' }
    expect(transform(input, toPostgres)).toContain('-- 备注')
  })

  it('source=auto 能按特征词判定原方言', () => {
    expect(detectDialect(tokenize('SELECT `a` FROM t LIMIT 1, 2'))).toBe('mysql')
    expect(detectDialect(tokenize('SELECT a::text FROM t RETURNING'))).toBe('postgres')
    expect(
      transform({ text: 'SELECT id FROM t LIMIT 3, 5' }, { source: 'auto', target: 'postgres' }),
    ).toContain('OFFSET 3')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, toPostgres)).toBe('')
    expect(transform({ text: ' \n\t ' }, toPostgres)).toBe('')
  })

  it('超长输入抛出 SqlDialectError（边界）', () => {
    expect(() => transform({ text: 'a'.repeat(200_001) }, toPostgres)).toThrow(SqlDialectError)
  })

  it('非法 SQL 抛出带位置的 SqlDialectError（异常）', () => {
    expect(() => transform({ text: "SELECT 'abc FROM t" }, toPostgres)).toThrow(/第 1 行/)
    expect(() => transform({ text: 'SELECT a) FROM t' }, toMysql)).toThrow(SqlDialectError)
    expect(() => transform({ text: 'SELECT ( FROM t' }, toMysql)).toThrow(SqlDialectError)
  })
})
