import { describe, expect, it } from 'vitest'
import {
  buildChartOption,
  EXAMPLE_CSV,
  parseChartType,
  parseCsv,
  parseSize,
  parseTitle,
  transform,
} from './utils'
import type { ChartGenOptions } from './schema'

const opts = (o: Partial<ChartGenOptions> = {}): ChartGenOptions => ({
  type: 'bar',
  title: '',
  width: '600',
  height: '400',
  ...o,
})

const csv = '类别,数量\n苹果,10\n香蕉,20'

describe('chart-gen / parse*', () => {
  it('默认值与合法值', () => {
    expect(parseChartType('')).toBe('bar')
    expect(parseChartType('line')).toBe('line')
    expect(parseChartType('pie')).toBe('pie')
    expect(parseChartType('scatter')).toBe('scatter')
    expect(parseTitle('  销售图  ')).toBe('销售图')
    expect(parseSize('', '宽', 600)).toBe(600)
  })
  it('非法类型抛错', () => {
    expect(() => parseChartType('area')).toThrow(/图表类型非法/)
  })
  it('尺寸越界抛错', () => {
    expect(() => parseSize('10', '宽', 600)).toThrow(/宽须在 100–2000/)
    expect(() => parseSize('5000', '高', 400)).toThrow(/高须在 100–2000/)
  })
})

describe('chart-gen / parseCsv', () => {
  it('正常解析表头与数据行', () => {
    const r = parseCsv('类别,数量\n苹果,10\n香蕉,20')
    expect(r.headers).toEqual(['类别', '数量'])
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]).toEqual(['苹果', 10])
  })
  it('单行数据抛错', () => {
    expect(() => parseCsv('类别,数量')).toThrow(/至少需要一行表头和一行数据/)
  })
  it('单列抛错', () => {
    expect(() => parseCsv('类别\n苹果')).toThrow(/至少需要两列/)
  })
  it('空行被忽略', () => {
    const r = parseCsv('类别,数量\n\n苹果,10\n\n')
    expect(r.rows).toHaveLength(1)
  })
})

describe('chart-gen / buildChartOption', () => {
  const csv = '类别,数量\n苹果,10\n香蕉,20'
  it('bar 图含 xAxis/category 与 series', () => {
    const o = buildChartOption(csv, 'bar', '')
    expect(o.xAxis).toMatchObject({ type: 'category' })
    expect(o.series as unknown[]).toHaveLength(1)
  })
  it('line 图 series 类型为 line', () => {
    const o = buildChartOption(csv, 'line', '')
    expect((o.series as { type: string }[])[0].type).toBe('line')
  })
  it('pie 图 series 类型为 pie，data 含 name/value', () => {
    const o = buildChartOption(csv, 'pie', '')
    const s = (o.series as { type: string; data: { name: string; value: number }[] }[])[0]
    expect(s.type).toBe('pie')
    expect(s.data[0]).toEqual({ name: '苹果', value: 10 })
  })
  it('scatter 图双值轴', () => {
    const o = buildChartOption('x,y\n1,2\n3,4', 'scatter', '')
    expect(o.xAxis).toMatchObject({ type: 'value' })
    expect((o.series as { type: string }[])[0].type).toBe('scatter')
  })
  it('带标题时设置 title', () => {
    const o = buildChartOption(csv, 'bar', '销售')
    expect(o.title).toMatchObject({ text: '销售' })
  })
  it('非法 CSV 抛错', () => {
    expect(() => buildChartOption('只有一行', 'bar', '')).toThrow(/至少需要一行表头/)
  })
})

describe('chart-gen / transform', () => {
  it('空输入返回示例 CSV', () => {
    expect(transform({ text: '   ' }, opts())).toBe(EXAMPLE_CSV)
  })
  it('非空输入原样返回', () => {
    expect(transform({ text: csv }, opts())).toBe(csv)
  })
})
