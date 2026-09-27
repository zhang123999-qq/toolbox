import { describe, expect, it } from 'vitest'
import { isoWeek, parseDate, transform } from './utils'

describe('iso-week / isoWeek', () => {
  it('普通日期输出 ISO 周格式', () => {
    expect(isoWeek(2026, 9, 27).format).toBe('2026-W39-7')
  })

  it('1 月 1 日若为周四，属当年 W01', () => {
    expect(isoWeek(2026, 1, 1).format).toBe('2026-W01-4')
  })

  it('跨年边界：2024-12-31 属 2025 年 W01', () => {
    const w = isoWeek(2024, 12, 31)
    expect(w.isoYear).toBe(2025)
    expect(w.week).toBe(1)
  })

  it('跨年边界：2025-12-29（周一）属 2026 年 W01', () => {
    const w = isoWeek(2025, 12, 29)
    expect(w.isoYear).toBe(2026)
    expect(w.format).toBe('2026-W01-1')
  })

  it('跨年边界：1 月初可能属上一年 W52（2023-01-01 周日 → 2022-W52-7）', () => {
    const w = isoWeek(2023, 1, 1)
    expect(w.isoYear).toBe(2022)
    expect(w.week).toBe(52)
    expect(w.format).toBe('2022-W52-7')
  })

  it('周几正确：周日=7、周一=1', () => {
    expect(isoWeek(2026, 9, 27).weekday).toBe(7)
    expect(isoWeek(2025, 12, 29).weekday).toBe(1)
  })

  it('周数在 1~53 之间', () => {
    for (const [y, m, d] of [
      [2026, 1, 1],
      [2026, 12, 31],
      [2025, 6, 15],
      [2000, 1, 1],
    ]) {
      const w = isoWeek(y, m, d)
      expect(w.week).toBeGreaterThanOrEqual(1)
      expect(w.week).toBeLessThanOrEqual(53)
    }
  })
})

describe('iso-week / parseDate & transform', () => {
  it('解析与非法日期', () => {
    expect(parseDate('2026-09-27')).toEqual({ y: 2026, m: 9, d: 27 })
    expect(() => parseDate('2026-02-30')).toThrow(/非法日期/)
  })

  it('transform 输出完整 ISO 周日期', () => {
    const out = transform({ text: '2026-09-27' }, {})
    expect(out).toContain('ISO 周日期：2026-W39-7')
    expect(out).toContain('ISO 周年：2026')
    expect(out).toContain('星期：周日')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
