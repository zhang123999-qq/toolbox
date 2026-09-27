import { describe, expect, it } from 'vitest'
import type { HolidayOptions } from './schema'
import { countWeekends, listFestivals, lunarToSolar, parseYear, transform } from './utils'

const base: HolidayOptions = {}

describe('holiday / 内联农历换算（锚点）', () => {
  it('2025 春节 = 2025-01-29，2024 春节 = 2024-02-10', () => {
    expect(lunarToSolar(2025, 1, 1)).toEqual({ y: 2025, m: 1, d: 29 })
    expect(lunarToSolar(2024, 1, 1)).toEqual({ y: 2024, m: 2, d: 10 })
  })

  it('2025 端午 = 5/31，中秋 = 10/06', () => {
    expect(lunarToSolar(2025, 5, 5)).toEqual({ y: 2025, m: 5, d: 31 })
    expect(lunarToSolar(2025, 8, 15)).toEqual({ y: 2025, m: 10, d: 6 })
  })
})

describe('holiday / listFestivals', () => {
  it('固定公历节日存在', () => {
    const list = listFestivals(2025)
    expect(list.find((f) => f.name === '元旦')?.date).toBe('2025-01-01')
    expect(list.find((f) => f.name === '劳动节')?.date).toBe('2025-05-01')
    expect(list.find((f) => f.name === '国庆节')?.date).toBe('2025-10-01')
  })

  it('农历节日被正确换算且整体按日期排序', () => {
    const list = listFestivals(2025)
    expect(list.find((f) => f.name === '春节')?.date).toBe('2025-01-29')
    expect(list.find((f) => f.name === '端午节')?.date).toBe('2025-05-31')
    const dates = list.map((f) => f.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('每年列出 8 个节日', () => {
    expect(listFestivals(2030)).toHaveLength(8)
    expect(listFestivals(1999)).toHaveLength(8)
  })
})

describe('holiday / countWeekends', () => {
  it('一年周末在 100~110 天区间', () => {
    const w = countWeekends(2025)
    expect(w).toBeGreaterThanOrEqual(100)
    expect(w).toBeLessThanOrEqual(110)
  })
})

describe('holiday / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('输出节日列表 + 非权威声明', () => {
    const out = transform({ text: '2025' }, base)
    expect(out).toContain('2025-01-29')
    expect(out).toContain('春节')
    expect(out).toContain('非权威')
  })

  it('越界年份抛中文错误', () => {
    expect(() => transform({ text: '1800' }, base)).toThrow(/覆盖范围/)
    expect(() => parseYear('abc')).toThrow(/无法识别/)
  })

  it('超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
