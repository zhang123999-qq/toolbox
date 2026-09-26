import { describe, expect, it } from 'vitest'
import { SqlMinifyError, transform } from './utils'
import type { SqlMinifyInput, SqlMinifyOptions } from './schema'

const baseOptions: SqlMinifyOptions = {}

describe('sql-minify / transform', () => {
  it('去掉换行与多余空白压成单行', () => {
    const input: SqlMinifyInput = { text: 'SELECT   a,\n   b\nFROM    t\nWHERE a > 1' }
    expect(transform(input, baseOptions)).toBe('SELECT a,b FROM t WHERE a > 1')
  })

  it('删除 -- 行注释与 # 注释', () => {
    const input: SqlMinifyInput = { text: 'select a -- 备注\nfrom t # 行尾\nwhere a = 1' }
    expect(transform(input, baseOptions)).toBe('select a from t where a = 1')
  })

  it('删除块注释', () => {
    const input: SqlMinifyInput = { text: 'select a /* 块\n注释 */ from t' }
    expect(transform(input, baseOptions)).toBe('select a from t')
  })

  it('字符串字面量里的空白原样保留', () => {
    const input: SqlMinifyInput = { text: "select 'hello   world' from t" }
    expect(transform(input, baseOptions)).toBe("select 'hello   world' from t")
  })

  it('函数名与列名清单的括号间隔各不相同', () => {
    const input: SqlMinifyInput = { text: 'select count( * ) from t' }
    expect(transform(input, baseOptions)).toBe('select count(*) from t')
    const insert: SqlMinifyInput = { text: 'insert into t ( a , b ) values ( 1 , 2 )' }
    expect(transform(insert, baseOptions)).toBe('insert into t (a,b) values (1,2)')
  })

  it('多语句以分号紧邻连接', () => {
    const input: SqlMinifyInput = { text: 'select 1;\nselect 2;\n' }
    expect(transform(input, baseOptions)).toBe('select 1;select 2;')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '  \n\t ' }, baseOptions)).toBe('')
  })

  it('超长输入抛出 SqlMinifyError（边界）', () => {
    expect(() => transform({ text: 'a'.repeat(200_001) }, baseOptions)).toThrow(SqlMinifyError)
  })

  it('括号不配对时抛出带位置的 SqlMinifyError（异常）', () => {
    expect(() => transform({ text: 'select count( from t' }, baseOptions)).toThrow(
      /第 1 行第 13 列/,
    )
    expect(() => transform({ text: 'select a) from t' }, baseOptions)).toThrow(SqlMinifyError)
  })

  it('引号未闭合时抛出 SqlMinifyError（异常）', () => {
    expect(() => transform({ text: "select 'abc from t" }, baseOptions)).toThrow(SqlMinifyError)
  })
})
