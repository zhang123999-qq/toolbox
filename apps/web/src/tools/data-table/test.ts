/**
 * data-table（#688）utils 单测：CSV 解析 / 排序 / 搜索 / 分页 / 导出。
 */
import { describe, expect, it } from 'vitest'
import {
  compareCells,
  filterRows,
  paginate,
  parseCsv,
  parsePageSize,
  sortRows,
  toCsv,
} from './utils'

describe('parseCsv', () => {
  it('解析基本 CSV', () => {
    const { headers, rows } = parseCsv('a,b\n1,2\n3,4')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('支持引号字段与 "" 转义及字段内换行', () => {
    const { headers, rows } = parseCsv('a,b\n"x, y","say ""hi"""\n"l1\nl2",z')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([
      ['x, y', 'say "hi"'],
      ['l1\nl2', 'z'],
    ])
  })

  it('兼容 CRLF 并忽略纯空行', () => {
    const { headers, rows } = parseCsv('a,b\r\n1,2\r\n\r\n3,4\r\n')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toHaveLength(2)
  })

  it('引号未闭合抛错', () => {
    expect(() => parseCsv('a\n"oops')).toThrowError('引号未闭合')
  })

  it('空输入与空表头抛错', () => {
    expect(() => parseCsv('   ')).toThrowError('CSV 为空')
    expect(() => parseCsv(',b\n1,2')).toThrowError('表头不能为空')
  })

  it('缺列的行补空由调用方处理：parseCsv 保留原样', () => {
    const { rows } = parseCsv('a,b,c\n1,2')
    expect(rows[0]).toEqual(['1', '2'])
  })
})

describe('compareCells', () => {
  it('数字按数值比', () => {
    expect(compareCells('2', '10')).toBeLessThan(0)
    expect(compareCells('10', '2')).toBeGreaterThan(0)
    expect(compareCells('3', '3')).toBe(0)
  })

  it('数字排在非数字前', () => {
    expect(compareCells('5', 'abc')).toBeLessThan(0)
    expect(compareCells('abc', '5')).toBeGreaterThan(0)
  })

  it('非数字按 locale 比', () => {
    expect(compareCells('a', 'b')).toBeLessThan(0)
  })

  it('小数与负数识别为数字', () => {
    expect(compareCells('-1.5', '-1')).toBeLessThan(0)
    expect(compareCells('0.5', 'abc')).toBeLessThan(0)
  })
})

describe('sortRows', () => {
  const rows = [
    ['b', '10'],
    ['a', '2'],
    ['c', '2'],
  ]

  it('升序排序（数字感知）', () => {
    expect(sortRows(rows, 1, 'asc').map((r) => r[0])).toEqual(['a', 'c', 'b'])
  })

  it('降序排序', () => {
    expect(sortRows(rows, 0, 'desc').map((r) => r[0])).toEqual(['c', 'b', 'a'])
  })

  it('dir 为 null 返回原序拷贝', () => {
    const out = sortRows(rows, 0, null)
    expect(out.map((r) => r[0])).toEqual(['b', 'a', 'c'])
    expect(out).not.toBe(rows)
  })

  it('排序稳定：相等元素保持原相对顺序', () => {
    const out = sortRows(rows, 1, 'asc')
    expect(out[0][0]).toBe('a')
    expect(out[1][0]).toBe('c')
  })

  it('缺列按空值处理：空值永远置后', () => {
    // 交错数据：保证比较器在 (空, 非空) 与 (非空, 空) 两种参数顺序下都被调用
    const rows = [['a', '2'], ['b'], ['c', '1'], ['d'], ['e', '3'], ['f']]
    const out = sortRows(rows, 1, 'asc')
    expect(out.map((r) => r[0])).toEqual(['c', 'a', 'e', 'b', 'd', 'f'])
    // 降序时空值同样置后
    const outDesc = sortRows(rows, 1, 'desc')
    expect(outDesc.map((r) => r[0])).toEqual(['e', 'a', 'c', 'b', 'd', 'f'])
  })

  it('多行混合空列：非空在前，空值保持原相对顺序', () => {
    const out = sortRows([['b'], ['a', ''], ['c', 'x']], 1, 'asc')
    expect(out.map((r) => r[0])).toEqual(['c', 'b', 'a'])
  })
})

describe('filterRows', () => {
  const rows = [
    ['张三', '北京'],
    ['李四', '上海'],
  ]

  it('关键词不区分大小写匹配任意单元格', () => {
    expect(filterRows(rows, '张')).toHaveLength(1)
    expect(filterRows(rows, 'BEIJING')).toHaveLength(0)
    expect(filterRows(rows, '上海')).toHaveLength(1)
  })

  it('空关键词返回全部拷贝', () => {
    const out = filterRows(rows, '  ')
    expect(out).toHaveLength(2)
    expect(out).not.toBe(rows)
  })
})

describe('paginate', () => {
  const rows = [['a'], ['b'], ['c'], ['d'], ['e']]

  it('正常分页', () => {
    const { pageRows, totalPages, page } = paginate(rows, 2, 2)
    expect(pageRows).toEqual([['c'], ['d']])
    expect(totalPages).toBe(3)
    expect(page).toBe(2)
  })

  it('页码越界钳制', () => {
    expect(paginate(rows, 99, 2).page).toBe(3)
    expect(paginate(rows, 0, 2).page).toBe(1)
  })

  it('空数据也有 1 页', () => {
    const { totalPages, pageRows } = paginate([], 1, 10)
    expect(totalPages).toBe(1)
    expect(pageRows).toEqual([])
  })

  it('pageSize 非正数按 1 处理', () => {
    expect(paginate(rows, 1, 0).totalPages).toBe(5)
  })
})

describe('parsePageSize', () => {
  it('空值默认 10', () => {
    expect(parsePageSize('')).toBe(10)
    expect(parsePageSize(' 20 ')).toBe(20)
  })

  it('非法值抛错', () => {
    expect(() => parsePageSize('abc')).toThrowError('正整数')
    expect(() => parsePageSize('0')).toThrowError('1–500')
    expect(() => parsePageSize('501')).toThrowError('1–500')
  })
})

describe('toCsv', () => {
  it('普通字段直接拼接', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\n1,2')
  })

  it('含逗号 / 引号 / 换行的字段加引号转义', () => {
    expect(toCsv(['a'], [['x,y'], ['say "hi"'], ['l1\nl2']])).toBe(
      'a\n"x,y"\n"say ""hi"""\n"l1\nl2"',
    )
  })
})
