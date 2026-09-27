import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  buildChartOption,
  describe as describeSeries,
  fmtFixed,
  parseSeries,
  summarizeText,
} from './utils'
import type { StatisticsOptions } from './schema'

const t = createTranslator('zh')
const ten = createTranslator('en')
const baseOptions = (): StatisticsOptions => ({ chart: 'bar', decimals: '2' })

describe('statistics / parseSeries', () => {
  it('空输入抛错', () => {
    expect(() => parseSeries('', t)).toThrow('没有找到有效数字')
    expect(() => parseSeries('  \n ', t)).toThrow('没有找到有效数字')
  })

  it('空输入英文报错', () => {
    expect(() => parseSeries('', ten)).toThrow('No valid numbers found')
  })

  it('超长输入抛错', () => {
    expect(() => parseSeries('1'.repeat(200001), t)).toThrow('输入超过 200,000 字符上限')
  })

  it('单数据点', () => {
    expect(parseSeries('42', t)).toEqual({ labels: ['1'], values: [42] })
  })

  it('空格分隔的多数字', () => {
    const s = parseSeries('10 20 30', t)
    expect(s.values).toEqual([10, 20, 30])
    expect(s.labels).toEqual(['1', '2', '3'])
  })

  it('逗号分隔的单行多数字', () => {
    expect(parseSeries('1,2,3', t).values).toEqual([1, 2, 3])
  })

  it('分号与制表符分隔', () => {
    expect(parseSeries('1;2\t3', t).values).toEqual([1, 2, 3])
  })

  it('标签,数值行', () => {
    const s = parseSeries('一月,120\n二月,200', t)
    expect(s).toEqual({ labels: ['一月', '二月'], values: [120, 200] })
  })

  it('负数数据', () => {
    expect(parseSeries('-5\n-2.5', t).values).toEqual([-5, -2.5])
  })

  it('空行跳过', () => {
    expect(parseSeries('1\n\n2\n', t).values).toEqual([1, 2])
  })

  it('非数字行抛错并带行号', () => {
    expect(() => parseSeries('10\nabc\n20', t)).toThrow('第 2 行不是有效数据：abc')
  })

  it('非数字行英文报错', () => {
    expect(() => parseSeries('abc', ten)).toThrow('Line 1 is not valid data: abc')
  })

  it('标签行但数值非法抛错', () => {
    expect(() => parseSeries('一月,abc', t)).toThrow('第 1 行')
  })

  it('只有分隔符的行抛错', () => {
    expect(() => parseSeries(',,,', t)).toThrow('第 1 行')
  })

  it('三字段混合行抛错', () => {
    expect(() => parseSeries('a,b,c', t)).toThrow('第 1 行')
  })

  it('Infinity 数据抛错', () => {
    expect(() => parseSeries('1\nInfinity', t)).toThrow('第 2 行')
  })
})

describe('statistics / describe', () => {
  it('空数组抛错', () => {
    expect(() => describeSeries([], t)).toThrow('没有找到有效数字')
  })

  it('单元素数组', () => {
    expect(describeSeries([7], t)).toEqual({ count: 1, sum: 7, mean: 7, min: 7, max: 7 })
  })

  it('多元素汇总', () => {
    expect(describeSeries([1, 2, 3, 4], t)).toEqual({
      count: 4,
      sum: 10,
      mean: 2.5,
      min: 1,
      max: 4,
    })
  })

  it('负数参与最值', () => {
    const s = describeSeries([-3, 5, -10], t)
    expect(s.min).toBe(-10)
    expect(s.max).toBe(5)
    expect(s.sum).toBe(-8)
  })
})

describe('statistics / fmtFixed', () => {
  it('去尾零', () => {
    expect(fmtFixed(2.5, 4)).toBe('2.5')
    expect(fmtFixed(2, 2)).toBe('2')
  })

  it('非有限数原样输出', () => {
    expect(fmtFixed(Infinity, 2)).toBe('Infinity')
  })
})

describe('statistics / buildChartOption', () => {
  const series = { labels: ['一月', '二月'], values: [120, 200] }

  it('柱状图 option', () => {
    const option = buildChartOption(series, 'bar', t) as {
      series: Array<{ type: string; data: number[] }>
      xAxis: { data: string[] }
    }
    expect(option.series[0].type).toBe('bar')
    expect(option.series[0].data).toEqual([120, 200])
    expect(option.xAxis.data).toEqual(['一月', '二月'])
  })

  it('折线图 option', () => {
    const option = buildChartOption(series, 'line', t) as {
      series: Array<{ type: string }>
    }
    expect(option.series[0].type).toBe('line')
  })

  it('饼图 option 用 name/value 结构', () => {
    const option = buildChartOption(series, 'pie', t) as {
      series: Array<{ type: string; data: Array<{ name: string; value: number }> }>
    }
    expect(option.series[0].type).toBe('pie')
    expect(option.series[0].data).toEqual([
      { name: '一月', value: 120 },
      { name: '二月', value: 200 },
    ])
  })

  it('缺省图表类型回退为柱状图', () => {
    const option = buildChartOption(series, undefined, t) as {
      series: Array<{ type: string }>
    }
    expect(option.series[0].type).toBe('bar')
  })

  it('标题走 i18n', () => {
    const zhOption = buildChartOption(series, 'bar', t) as { title: { text: string } }
    const enOption = buildChartOption(series, 'bar', ten) as { title: { text: string } }
    expect(zhOption.title.text).toBe('数据分布')
    expect(enOption.title.text).toBe('Data distribution')
  })
})

describe('statistics / summarizeText', () => {
  it('空输入返回空串', () => {
    expect(summarizeText({ text: '' }, baseOptions(), t)).toBe('')
  })

  it('输出汇总五行', () => {
    const out = summarizeText({ text: '一月,120\n二月,200\n三月,150' }, baseOptions(), t)
    expect(out).toContain('数据个数: 3')
    expect(out).toContain('总和: 470')
    expect(out).toContain('平均数: 156.67')
    expect(out).toContain('最小值: 120')
    expect(out).toContain('最大值: 200')
  })

  it('小数位数选项生效', () => {
    const options = baseOptions()
    options.decimals = '0'
    const out = summarizeText({ text: '1\n2' }, options, t)
    expect(out).toContain('平均数: 2')
  })

  it('缺省小数位走默认值分支', () => {
    const partial = { chart: 'bar' } as StatisticsOptions
    const out = summarizeText({ text: '1\n2' }, partial, t)
    expect(out).toContain('平均数: 1.5')
  })

  it('总和溢出为 Infinity 时原样输出', () => {
    const out = summarizeText({ text: '1e308\n1e308' }, baseOptions(), t)
    expect(out).toContain('总和: Infinity')
  })
})
