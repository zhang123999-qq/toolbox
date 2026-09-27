import { describe, expect, it } from 'vitest'
import { fiscalYearInfo, parseDate, transform } from './utils'

describe('fiscal-year / fiscalYearInfo', () => {
  it('默认 1 月起始：2025-06 → FY2025，区间 2025-01-01 ~ 2025-12-31', () => {
    const f = fiscalYearInfo(2025, 6, 15, 1)
    expect(f.fyLabel).toBe('FY2025')
    expect(f.start).toBe('2025-01-01')
    expect(f.end).toBe('2025-12-31')
  })

  it('4 月起始（日本/微软财年）：2025-06 → FY2025（2025-04-01 ~ 2026-03-31）', () => {
    const f = fiscalYearInfo(2025, 6, 15, 4)
    expect(f.fyLabel).toBe('FY2025')
    expect(f.start).toBe('2025-04-01')
    expect(f.end).toBe('2026-03-31')
  })

  it('4 月起始时年初月份（2 月）归上一财年：2025-02 → FY2024', () => {
    const f = fiscalYearInfo(2025, 2, 15, 4)
    expect(f.fyLabel).toBe('FY2024')
    expect(f.start).toBe('2024-04-01')
    expect(f.end).toBe('2025-03-31')
  })

  it('7 月起始（澳大利亚/美国政府财年）：2025-09 → FY2025（2025-07-01 ~ 2026-06-30）', () => {
    const f = fiscalYearInfo(2025, 9, 15, 7)
    expect(f.fyLabel).toBe('FY2025')
    expect(f.start).toBe('2025-07-01')
    expect(f.end).toBe('2026-06-30')
  })

  it('7 月起始时年初月份归上一财年：2025-02 → FY2024', () => {
    const f = fiscalYearInfo(2025, 2, 15, 7)
    expect(f.fyLabel).toBe('FY2024')
    expect(f.start).toBe('2024-07-01')
    expect(f.end).toBe('2025-06-30')
  })

  it('财年进度在 0~100，财年末当天距年末为 1 天', () => {
    const mid = fiscalYearInfo(2025, 6, 15, 1)
    expect(mid.progress).toBeGreaterThan(0)
    expect(mid.progress).toBeLessThan(100)
    const last = fiscalYearInfo(2025, 12, 31, 1)
    expect(last.daysToEnd).toBe(1)
  })

  it('起始月非法报错', () => {
    expect(() => fiscalYearInfo(2025, 6, 15, 13)).toThrow(/财年起始月/)
  })
})

describe('fiscal-year / parseDate & transform', () => {
  it('解析与非法日期', () => {
    expect(parseDate('2025-06-15')).toEqual({ y: 2025, m: 6, d: 15 })
    expect(() => parseDate('2025-02-30')).toThrow(/非法日期/)
  })

  it('transform（默认 1 月）输出财年', () => {
    const out = transform({ text: '2025-06-15' }, { startMonth: '1' })
    expect(out).toContain('所属财年：FY2025')
    expect(out).toContain('财年起止：2025-01-01 ~ 2025-12-31')
    expect(out).toContain('财年进度：')
    expect(out).toContain('距财年末：')
  })

  it('transform（4 月起始）输出 FY2025 区间跨次年 3 月', () => {
    const out = transform({ text: '2025-06-15' }, { startMonth: '4' })
    expect(out).toContain('所属财年：FY2025')
    expect(out).toContain('财年起止：2025-04-01 ~ 2026-03-31')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { startMonth: '1' })).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, { startMonth: '1' })).toThrow(/上限/)
  })
})
