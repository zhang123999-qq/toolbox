import { describe, expect, it } from 'vitest'
import { escapeSql, transform, unescapeSql } from './utils'

const my = { direction: 'escape', type: 'mysql', quote: false } as const
const myQ = { direction: 'escape', type: 'mysql', quote: true } as const
const pg = { direction: 'escape', type: 'postgres', quote: false } as const
const ms = { direction: 'escape', type: 'sqlserver', quote: false } as const
const unMy = { direction: 'unescape', type: 'mysql', quote: false } as const
const unPg = { direction: 'unescape', type: 'postgres', quote: false } as const
const unMs = { direction: 'unescape', type: 'sqlserver', quote: false } as const

describe('sql-escape / escape', () => {
  it('MySQL 转义单引号、双引号与反斜杠', () => {
    expect(escapeSql('O\'Brien "x" a\\b', 'mysql')).toBe('O\\\'Brien \\"x\\" a\\\\b')
  })

  it('MySQL 转义换行、制表与 NUL', () => {
    expect(escapeSql('a\nb\tc\u0000d', 'mysql')).toBe('a\\nb\\tc\\0d')
  })

  it('PostgreSQL 把单引号写成两个，反斜杠不动', () => {
    expect(escapeSql("O'Brien", 'postgres')).toBe("O''Brien")
    expect(escapeSql('a\\b', 'postgres')).toBe('a\\b')
  })

  it('SQL Server 同标准双写规则', () => {
    expect(escapeSql("it's", 'sqlserver')).toBe("it''s")
  })

  it('quote 选项加上首尾单引号', () => {
    expect(transform({ text: "O'Brien" }, myQ)).toBe("'O\\'Brien'")
  })
})

describe('sql-escape / unescape', () => {
  it('还原 MySQL 的反斜杠转义', () => {
    expect(unescapeSql("O\\'Brien", 'mysql')).toBe("O'Brien")
    expect(unescapeSql('a\\nb', 'mysql')).toBe('a\nb')
  })

  it('MySQL 兼容两个单引号的写法', () => {
    expect(unescapeSql("O''Brien", 'mysql')).toBe("O'Brien")
  })

  it('还原 PostgreSQL / SQL Server 的双写单引号', () => {
    expect(transform({ text: "O''Brien" }, unPg)).toBe("O'Brien")
    expect(transform({ text: "it''s" }, unMs)).toBe("it's")
  })

  it('带首尾引号的字面量能直接还原', () => {
    expect(unescapeSql("'O''Brien'", 'postgres')).toBe("O'Brien")
  })

  it('兼容 SQL Server 的 N\u0027...\u0027 前缀', () => {
    expect(unescapeSql("N'a''b'", 'sqlserver')).toBe("a'b")
  })
})

describe('sql-escape / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: "O'Brien" }, my)).toBe("O\\'Brien")
    expect(transform({ text: "O\\'Brien" }, unMy)).toBe("O'Brien")
  })

  it('往返一致（引号 + 反斜杠 + 换行）', () => {
    const text = "O'Brien 100% \\ 换行\n结束"
    expect(transform({ text: transform({ text }, my) }, unMy)).toBe(text)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, my)).toBe('')
    expect(transform({ text: '' }, unMy)).toBe('')
  })

  it('非法输入抛出可读错误', () => {
    expect(() => transform({ text: 'abc\\' }, unMy)).toThrow(/孤立的反斜杠/)
  })

  it('PostgreSQL 与 SQL Server 在纯引号场景下结果一致', () => {
    const text = "a'b"
    expect(transform({ text }, pg)).toBe(transform({ text }, ms))
  })
})
