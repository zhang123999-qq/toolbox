/**
 * data-sort（#690）utils 单测：规则解析 / 单元格比较 / 稳定多列排序。
 */
import { describe, expect, it } from 'vitest'
import { compareCells, multiSortRows, parseCsv, parseSortRule, parseSortSpec, toCsv, type Row } from './utils'

const HEADERS = ['姓名', '年龄', '城市', '销售额']
const ROWS: Row[] = [
  ['张三', '28', '北京', '12000'],
  ['李四', '35', '上海', '9800'],
  ['王五', '28', '广州', '15300'],
  ['赵六', '41', '深圳', ''],
]

describe('parseSortRule', () => {
  it('解析完整规则', () => {
    expect(parseSortRule('年龄:desc', 1)).toEqual({ column: '年龄', dir: 'desc' })
  })

  it('方向缺省为 asc，大小写不敏感', () => {
    expect(parseSortRule('年龄', 2)).toEqual({ column: '年龄', dir: 'asc' })
    expect(parseSortRule('年龄:ASC', 3)).toEqual({ column: '年龄', dir: 'asc' })
  })

  it('列名可含冒号（取最后一个冒号分隔）', () => {
    expect(parseSortRule('时间:创建:desc', 4)).toEqual({ column: '时间:创建', dir: 'desc' })
  })

  it('非法方向与空列名抛错并带行号', () => {
    expect(() => parseSortRule('年龄:up', 5)).toThrowError('第 5 条规则方向须为 asc 或 desc')
    expect(() => parseSortRule(':desc', 6)).toThrowError('第 6 条规则列名为空')
    expect(() => parseSortRule('   ', 7)).toThrowError('第 7 条规则为空')
    // 方向为空：错误信息标注"（空）"
    expect(() => parseSortRule('年龄:', 8)).toThrowError('（空）')
  })
})

describe('parseSortSpec', () => {
  it('多行解析并跳过空行', () => {
    expect(parseSortSpec('年龄:desc\n\n销售额:asc\n')).toEqual([
      { column: '年龄', dir: 'desc' },
      { column: '销售额', dir: 'asc' },
    ])
  })

  it('全空抛错', () => {
    expect(() => parseSortSpec('  \n ')).toThrowError('至少需要 1 条排序规则')
  })

  it('超过 10 条抛错', () => {
    const many = Array.from({ length: 11 }, (_, i) => `列${i}:asc`).join('\n')
    expect(() => parseSortSpec(many)).toThrowError('最多支持 10 条排序规则')
  })

  it('重复列抛错', () => {
    expect(() => parseSortSpec('年龄:asc\n年龄:desc')).toThrowError('列「年龄」重复')
  })
})

describe('compareCells', () => {
  it('空值永远置后', () => {
    expect(compareCells('', 'abc')).toBeGreaterThan(0)
    expect(compareCells('abc', '')).toBeLessThan(0)
    expect(compareCells('', '')).toBe(0)
    expect(compareCells('  ', '')).toBe(0)
  })

  it('数字按数值比', () => {
    expect(compareCells('9', '10')).toBeLessThan(0)
    expect(compareCells('10', '9')).toBeGreaterThan(0)
  })

  it('数字排在文本前', () => {
    expect(compareCells('5', 'abc')).toBeLessThan(0)
    expect(compareCells('abc', '5')).toBeGreaterThan(0)
  })

  it('文本按 locale 比', () => {
    expect(compareCells('a', 'b')).toBeLessThan(0)
    expect(compareCells(undefined as unknown as string, 'x')).toBeGreaterThan(0)
    expect(compareCells('x', undefined as unknown as string)).toBeLessThan(0)
  })
})

describe('multiSortRows', () => {
  it('单列降序', () => {
    const out = multiSortRows(HEADERS, ROWS, [{ column: '年龄', dir: 'desc' }])
    expect(out.map((r) => r[0])).toEqual(['赵六', '李四', '张三', '王五'])
  })

  it('多列：年龄降序 → 销售额升序', () => {
    const out = multiSortRows(HEADERS, ROWS, [
      { column: '年龄', dir: 'desc' },
      { column: '销售额', dir: 'asc' },
    ])
    // 年龄 28 的两人按销售额升序：张三 12000 < 王五 15300
    expect(out.map((r) => r[0])).toEqual(['赵六', '李四', '张三', '王五'])
  })

  it('空值置后（销售额为空的赵六排在最后，即使年龄最大）', () => {
    const out = multiSortRows(HEADERS, ROWS, [{ column: '销售额', dir: 'asc' }])
    expect(out[out.length - 1][0]).toBe('赵六')
    expect(out[0][0]).toBe('李四')
  })

  it('排序稳定', () => {
    const out = multiSortRows(HEADERS, ROWS, [{ column: '年龄', dir: 'asc' }])
    const idx28 = out.filter((r) => r[1] === '28').map((r) => r[0])
    expect(idx28).toEqual(['张三', '王五'])
  })

  it('不存在的列抛错', () => {
    expect(() => multiSortRows(HEADERS, ROWS, [{ column: '国家', dir: 'asc' }])).toThrowError('列「国家」不存在于表头')
  })

  it('缺列的行按空字符串处理（空值置后）', () => {
    const out = multiSortRows(HEADERS, [['张三'], ['李四', '35']], [{ column: '年龄', dir: 'asc' }])
    expect(out.map((r) => r[0])).toEqual(['李四', '张三'])
    // 缺列行在后插入：覆盖比较器 x 侧的缺列分支
    const out2 = multiSortRows(HEADERS, [['李四', '35'], ['张三']], [{ column: '年龄', dir: 'asc' }])
    expect(out2.map((r) => r[0])).toEqual(['李四', '张三'])
  })
})

describe('parseCsv（复用实现冒烟）', () => {
  it('解析示例', () => {
    const { headers } = parseCsv('a,b\n1,2')
    expect(headers).toEqual(['a', 'b'])
  })

  it('引号未闭合抛错', () => {
    expect(() => parseCsv('"oops')).toThrowError('引号未闭合')
  })

  it('支持 "" 转义与字段内逗号', () => {
    const { rows } = parseCsv('a,b\n"x""y","p,q"')
    expect(rows).toEqual([['x"y', 'p,q']])
  })

  it('末尾换行不产生空行', () => {
    const { headers, rows } = parseCsv('a,b\n1,2\n')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['1', '2']])
  })

  it('空输入与空表头抛错', () => {
    expect(() => parseCsv('   ')).toThrowError('CSV 为空')
    expect(() => parseCsv(',b\n1,2')).toThrowError('表头不能为空')
  })
})

describe('toCsv', () => {
  it('普通字段直接拼接', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\n1,2')
  })

  it('含逗号 / 引号 / 换行的字段加引号转义', () => {
    expect(toCsv(['a'], [['x,y'], ['say "hi"'], ['l1\nl2']])).toBe('a\n"x,y"\n"say ""hi"""\n"l1\nl2"')
  })
})
