import { describe, expect, it } from 'vitest'
import {
  buildGaugeOption,
  GAUGE_COLORS,
  parseGaugeInput,
  parseSize,
  parseTitle,
  transform,
} from './utils'
import type { GaugeInput } from './schema'

const input = (o: Partial<GaugeInput>): GaugeInput => ({ text: '', value: '', min: '', max: '', ...o })

describe('gauge / parseGaugeInput', () => {
  it('正常解析', () => {
    expect(parseGaugeInput('75', '0', '100')).toEqual({ value: 75, min: 0, max: 100 })
  })
  it('边界值允许（等于 min / max）', () => {
    expect(parseGaugeInput('0', '0', '100').value).toBe(0)
    expect(parseGaugeInput('100', '0', '100').value).toBe(100)
  })
  it('空值抛错', () => {
    expect(() => parseGaugeInput('', '0', '100')).toThrow(/当前值不能为空/)
    expect(() => parseGaugeInput('75', '  ', '100')).toThrow(/最小值不能为空/)
    expect(() => parseGaugeInput('75', '0', '')).toThrow(/最大值不能为空/)
  })
  it('非数字抛错', () => {
    expect(() => parseGaugeInput('abc', '0', '100')).toThrow(/当前值格式非法/)
    expect(() => parseGaugeInput('75', 'x', '100')).toThrow(/最小值格式非法/)
    expect(() => parseGaugeInput('75', '0', 'y')).toThrow(/最大值格式非法/)
  })
  it('最小值 ≥ 最大值抛错', () => {
    expect(() => parseGaugeInput('50', '100', '100')).toThrow(/最小值须小于最大值/)
    expect(() => parseGaugeInput('50', '120', '100')).toThrow(/最小值须小于最大值/)
  })
  it('当前值越界抛错', () => {
    expect(() => parseGaugeInput('-1', '0', '100')).toThrow(/当前值须在 0–100 之间/)
    expect(() => parseGaugeInput('101', '0', '100')).toThrow(/当前值须在 0–100 之间/)
  })
})

describe('gauge / buildGaugeOption', () => {
  const parsed = { value: 75, min: 0, max: 100 }

  it('构建 gauge series：min/max/value 与三段色', () => {
    const opt = buildGaugeOption(parsed, '')
    const series = opt.series as Array<{
      type: string
      min: number
      max: number
      axisLine: { lineStyle: { width: number; color: unknown } }
      data: Array<{ value: number; name: string }>
    }>
    expect(series[0].type).toBe('gauge')
    expect(series[0].min).toBe(0)
    expect(series[0].max).toBe(100)
    expect(series[0].axisLine.lineStyle.width).toBe(20)
    expect(series[0].axisLine.lineStyle.color).toEqual(
      GAUGE_COLORS.map(([stop, c]) => [stop, c]),
    )
    expect(series[0].data).toEqual([{ value: 75, name: '当前值' }])
  })
  it('空标题不带 title 字段', () => {
    expect(buildGaugeOption(parsed, '')).not.toHaveProperty('title')
  })
  it('非空标题带 title 字段且数据名用标题', () => {
    const opt = buildGaugeOption(parsed, '完成度')
    expect(opt.title).toEqual({ text: '完成度', left: 'center' })
    const series = opt.series as Array<{ data: Array<{ name: string }> }>
    expect(series[0].data[0].name).toBe('完成度')
  })
})

describe('gauge / parseTitle', () => {
  it('去首尾空白', () => {
    expect(parseTitle('  完成度  ')).toBe('完成度')
  })
  it('空串返回空串', () => {
    expect(parseTitle('   ')).toBe('')
  })
})

describe('gauge / parseSize', () => {
  it('留空回 fallback', () => {
    expect(parseSize('', '宽度', 600)).toBe(600)
  })
  it('正常解析', () => {
    expect(parseSize('800', '宽度', 600)).toBe(800)
  })
  it('非数字抛错', () => {
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法/)
  })
  it('越界抛错', () => {
    expect(() => parseSize('50', '宽度', 600)).toThrow(/宽度须在 100–2000 之间/)
    expect(() => parseSize('2500', '宽度', 600)).toThrow(/宽度须在 100–2000 之间/)
  })
})

describe('gauge / transform', () => {
  it('返回去空白后的文本', () => {
    expect(transform(input({ text: '  备注  ' }))).toBe('备注')
    expect(transform(input({ text: '' }))).toBe('')
  })
})
