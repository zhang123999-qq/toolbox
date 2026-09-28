import { describe, expect, it } from 'vitest'
import { EXAMPLE_CSV, parseCsv, pivotTable, toPivotCsv, transform, type PivotResult } from './utils'
import type { PivotInput } from './schema'

const input = (o: Partial<PivotInput>): PivotInput => ({
  text: '',
  rowKey: '',
  colKey: '',
  valKey: '',
  ...o,
})

const SUM_OPTS = { rowKey: '地区', colKey: '季度', valKey: '销售额', agg: 'sum' }

describe('pivot / parseCsv', () => {
  it('解析简单 CSV', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })
  it('兼容 \\r\\n 并跳过空行', () => {
    expect(parseCsv('a,b\r\n\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
  it('引号包裹含逗号的字段', () => {
    expect(parseCsv('"a,b",c')).toEqual([['a,b', 'c']])
  })
  it('双引号转义', () => {
    expect(parseCsv('"a""b",c')).toEqual([['a"b', 'c']])
  })
  it('字段中间的引号按字面处理', () => {
    expect(parseCsv('a"b,c')).toEqual([['a"b', 'c']])
  })
  it('尾逗号产生空字段', () => {
    expect(parseCsv('a,')).toEqual([['a', '']])
  })
  it('引号未闭合抛错', () => {
    expect(() => parseCsv('"abc,def')).toThrow(/引号未闭合/)
  })
  it('空文本返回空数组', () => {
    expect(parseCsv('  \n ')).toEqual([])
  })
})

describe('pivot / pivotTable', () => {
  const rows = () => parseCsv(EXAMPLE_CSV)

  it('求和透视：行列分组正确', () => {
    const r = pivotTable(rows(), SUM_OPTS)
    expect(r.rowHeaders).toEqual(['华东', '华南', '华北'])
    expect(r.colHeaders).toEqual(['Q1', 'Q2'])
    expect(r.matrix).toEqual([
      [120, 150],
      [200, 180],
      [90, null],
    ])
  })
  it('行合计 / 列合计 / 总计', () => {
    const r = pivotTable(rows(), SUM_OPTS)
    expect(r.rowTotals).toEqual([270, 380, 90])
    expect(r.colTotals).toEqual([410, 330])
    expect(r.grandTotal).toBe(740)
  })
  it('计数聚合忽略值列内容', () => {
    const r = pivotTable(parseCsv('组,项,备注\nA,x,好\nA,y,差\nB,x,中'), {
      rowKey: '组',
      colKey: '项',
      valKey: '备注',
      agg: 'count',
    })
    expect(r.matrix).toEqual([
      [1, 1],
      [1, null],
    ])
    expect(r.grandTotal).toBe(3)
  })
  it('平均聚合消除浮点误差', () => {
    const r = pivotTable(parseCsv('组,值\nA,0.1\nA,0.2'), {
      rowKey: '组',
      colKey: '组',
      valKey: '值',
      agg: 'avg',
    })
    expect(r.matrix).toEqual([[0.15]])
    expect(r.grandTotal).toBe(0.15)
  })
  it('最大 / 最小聚合', () => {
    const csv = parseCsv('组,项,值\nA,x,3\nA,x,7\nA,y,5')
    const base = { rowKey: '组', colKey: '项', valKey: '值' }
    expect(pivotTable(csv, { ...base, agg: 'max' }).matrix).toEqual([[7, 5]])
    expect(pivotTable(csv, { ...base, agg: 'min' }).matrix).toEqual([[3, 5]])
  })
  it('行列顺序按首次出现', () => {
    const r = pivotTable(parseCsv('R,C,V\nB,y,1\nA,x,2\nB,x,3'), {
      rowKey: 'R',
      colKey: 'C',
      valKey: 'V',
      agg: 'sum',
    })
    expect(r.rowHeaders).toEqual(['B', 'A'])
    expect(r.colHeaders).toEqual(['y', 'x'])
  })
  it('空 CSV 抛错', () => {
    expect(() => pivotTable([], SUM_OPTS)).toThrow(/CSV 为空/)
  })
  it('只有表头抛错', () => {
    expect(() => pivotTable([['地区', '季度', '销售额']], SUM_OPTS)).toThrow(/没有数据行/)
  })
  it('维度列不存在抛错', () => {
    expect(() => pivotTable(rows(), { ...SUM_OPTS, rowKey: '城市' })).toThrow(/找不到行维度列/)
    expect(() => pivotTable(rows(), { ...SUM_OPTS, colKey: '月份' })).toThrow(/找不到列维度列/)
    expect(() => pivotTable(rows(), { ...SUM_OPTS, valKey: '金额' })).toThrow(/找不到值列/)
  })
  it('聚合方式非法抛错', () => {
    expect(() => pivotTable(rows(), { ...SUM_OPTS, agg: 'median' })).toThrow(/聚合方式非法/)
  })
  it('值列非数字抛错（带行号）', () => {
    const bad = parseCsv('地区,季度,销售额\n华东,Q1,abc')
    expect(() => pivotTable(bad, SUM_OPTS)).toThrow(/第 2 行.*不是有效数字/)
  })
  it('值列空值抛错', () => {
    const bad = parseCsv('地区,季度,销售额\n华东,Q1,')
    expect(() => pivotTable(bad, SUM_OPTS)).toThrow(/不是有效数字/)
  })
  it('行维度缺列时按空字符串分组', () => {
    const r = pivotTable(parseCsv('R,C,V\nA,x,1\nB,y'), {
      rowKey: 'V',
      colKey: 'C',
      valKey: 'R',
      agg: 'count',
    })
    expect(r.rowHeaders).toEqual(['1', ''])
    expect(r.colHeaders).toEqual(['x', 'y'])
    expect(r.matrix).toEqual([
      [1, null],
      [null, 1],
    ])
  })
  it('列维度缺列时按空字符串分组', () => {
    const r = pivotTable(parseCsv('R,C,V\nA,x,1\nB,y'), {
      rowKey: 'R',
      colKey: 'V',
      valKey: 'C',
      agg: 'count',
    })
    expect(r.rowHeaders).toEqual(['A', 'B'])
    expect(r.colHeaders).toEqual(['1', ''])
    expect(r.matrix).toEqual([
      [1, null],
      [null, 1],
    ])
  })
  it('值列缺列时报非数字错误', () => {
    const bad = parseCsv('R,C,V\nA,x,1\nB,y')
    expect(() => pivotTable(bad, { rowKey: 'R', colKey: 'C', valKey: 'V', agg: 'sum' })).toThrow(
      /第 3 行.*不是有效数字/,
    )
  })
})

describe('pivot / toPivotCsv', () => {
  it('导出含合计的 CSV', () => {
    const r = pivotTable(parseCsv(EXAMPLE_CSV), SUM_OPTS)
    expect(toPivotCsv(r, '地区/季度')).toBe(
      '地区/季度,Q1,Q2,行合计\n华东,120,150,270\n华南,200,180,380\n华北,90,,90\n列合计,410,330,740',
    )
  })
  it('含逗号的表头自动加引号', () => {
    const r: PivotResult = {
      rowHeaders: ['A'],
      colHeaders: ['x,y'],
      matrix: [[1]],
      rowTotals: [1],
      colTotals: [1],
      grandTotal: 1,
    }
    expect(toPivotCsv(r, '角')).toBe('角,"x,y",行合计\nA,1,1\n列合计,1,1')
  })
})

describe('pivot / transform', () => {
  it('空输入用示例 CSV', () => {
    expect(transform(input({ text: '  ' }))).toBe(EXAMPLE_CSV)
  })
  it('非空输入去空白后返回', () => {
    expect(transform(input({ text: '  a,b  ' }))).toBe('a,b')
  })
})
