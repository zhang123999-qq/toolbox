import { describe, expect, it } from 'vitest'
import { SqlFormatError, transform } from './utils'
import type { SqlFormatInput, SqlFormatOptions } from './schema'

const baseOptions: SqlFormatOptions = { mode: 'upper', indent: '2' }

describe('sql-format / transform', () => {
  it('关键字转大写并按子句换行', () => {
    const input: SqlFormatInput = { text: 'select a, b from t where a > 1 order by b desc' }
    expect(transform(input, baseOptions)).toBe(
      ['SELECT a, b', 'FROM t', 'WHERE a > 1', 'ORDER BY b DESC'].join('\n'),
    )
  })

  it('mode=lower 时关键字转小写', () => {
    const input: SqlFormatInput = { text: 'SELECT A FROM T' }
    expect(transform(input, { mode: 'lower', indent: '2' })).toBe(['select A', 'from T'].join('\n'))
  })

  it('缩进档位切换为 8 空格时子查询内容跟着加深', () => {
    const input: SqlFormatInput = { text: 'select * from (select id from t) x' }
    expect(transform(input, { mode: 'upper', indent: '8' })).toBe(
      ['SELECT *', 'FROM (', '        SELECT id', '        FROM t', ') x'].join('\n'),
    )
  })

  it('保留行注释与块注释，且注释独占一行', () => {
    const input: SqlFormatInput = { text: 'select a -- 备注\nfrom t /* 块 */ where a = 1' }
    expect(transform(input, baseOptions)).toBe(
      ['SELECT a', '-- 备注', 'FROM t', '/* 块 */', 'WHERE a = 1'].join('\n'),
    )
  })

  it('字符串字面量里的空白原样保留', () => {
    const input: SqlFormatInput = { text: "select 'a   b' from t" }
    expect(transform(input, baseOptions)).toBe(["SELECT 'a   b'", 'FROM t'].join('\n'))
  })

  it('CREATE TABLE 的列清单逐列换行', () => {
    const input: SqlFormatInput = { text: 'create table users (id int not null, name varchar(64))' }
    expect(transform(input, baseOptions)).toBe(
      ['CREATE TABLE users (', '  id INT NOT NULL,', '  name VARCHAR(64)', ')'].join('\n'),
    )
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '   \n\t ' }, baseOptions)).toBe('')
  })

  it('超长输入抛出 SqlFormatError（边界）', () => {
    expect(() => transform({ text: 'a'.repeat(200_001) }, baseOptions)).toThrow(SqlFormatError)
  })

  it('括号不配对时抛出带位置的 SqlFormatError（异常）', () => {
    expect(() => transform({ text: 'select count( from t' }, baseOptions)).toThrow(
      /第 1 行第 13 列/,
    )
    expect(() => transform({ text: 'select a) from t' }, baseOptions)).toThrow(SqlFormatError)
  })

  it('引号或注释未闭合时抛出 SqlFormatError（异常）', () => {
    expect(() => transform({ text: "select 'abc from t" }, baseOptions)).toThrow(SqlFormatError)
    expect(() => transform({ text: '/* 未闭合 select 1' }, baseOptions)).toThrow(SqlFormatError)
  })
})
