import { describe, expect, it } from 'vitest'
import { isoWeek, isoWeeksInYear, mondayOfWeek, parseDate, sundayOfWeek, transform } from './utils'

const empty = {}

describe('week-number / isoWeek 常规', () => {
  it('2026-09-27（周日）属于 2026 年某周', () => {
    const { year, week } = isoWeek(parseDate('2026-09-27'))
    expect(year).toBe(2026)
    expect(week).toBeGreaterThan(0)
    expect(week).toBeLessThanOrEqual(isoWeeksInYear(2026))
  })

  it('周一为一周开始：同周内的周一到周日周号一致（9/21 周一 ~ 9/27 周日）', () => {
    const wMon = isoWeek(parseDate('2026-09-21'))
    const wSat = isoWeek(parseDate('2026-09-26'))
    const wSun = isoWeek(parseDate('2026-09-27'))
    expect(wMon.week).toBe(wSat.week)
    expect(wSat.week).toBe(wSun.week)
    // 下一周周一（9/28）周号 +1
    const wNext = isoWeek(parseDate('2026-09-28'))
    expect(wNext.week).toBe(wSun.week + 1)
  })
})

describe('week-number / ISO 周边界', () => {
  it('2023-01-01（周日）属于 2022 年第 52 周', () => {
    const { year, week } = isoWeek(parseDate('2023-01-01'))
    expect(year).toBe(2022)
    expect(week).toBe(52)
  })

  it('2012-01-01（周日）属于 2011 年第 52 周', () => {
    const { year, week } = isoWeek(parseDate('2012-01-01'))
    expect(year).toBe(2011)
    expect(week).toBe(52)
  })

  it('2020-12-31（周四）属于 2020 年第 53 周', () => {
    const { year, week } = isoWeek(parseDate('2020-12-31'))
    expect(year).toBe(2020)
    expect(week).toBe(53)
  })

  it('2025-12-31（周三）属于 2026 年第 1 周', () => {
    const { year, week } = isoWeek(parseDate('2025-12-31'))
    expect(year).toBe(2026)
    expect(week).toBe(1)
  })

  it('2026-01-01（周四）是 2026 年第 1 周', () => {
    const { year, week } = isoWeek(parseDate('2026-01-01'))
    expect(year).toBe(2026)
    expect(week).toBe(1)
  })

  it('2026-12-31（周四）属于 2026 年（不是下年第 1 周）', () => {
    const { year, week } = isoWeek(parseDate('2026-12-31'))
    expect(year).toBe(2026)
    expect(week).toBe(53)
  })
})

describe('week-number / isoWeeksInYear', () => {
  it('2020 有 53 周（闰年且 1-1 周三）', () => {
    expect(isoWeeksInYear(2020)).toBe(53)
  })

  it('2026 有 53 周（1-1 周四）', () => {
    expect(isoWeeksInYear(2026)).toBe(53)
  })

  it('普通年 52 周', () => {
    expect(isoWeeksInYear(2025)).toBe(52)
    expect(isoWeeksInYear(2024)).toBe(52)
  })
})

describe('week-number / 周一/周日', () => {
  it('2026-09-27（周日）所在周周一是 2026-09-21，周日是 2026-09-27', () => {
    const d = parseDate('2026-09-27')
    expect(mondayOfWeek(d)).toEqual(new Date(2026, 8, 21))
    expect(sundayOfWeek(d)).toEqual(new Date(2026, 8, 27))
  })

  it('2026-09-28（周一）所在周周一是当天', () => {
    const d = parseDate('2026-09-28')
    expect(mondayOfWeek(d)).toEqual(new Date(2026, 8, 28))
    expect(sundayOfWeek(d)).toEqual(new Date(2026, 9, 4))
  })
})

describe('week-number / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('输出 Wxx 与周一/周日', () => {
    const out = transform({ text: '2026-09-27' }, empty)
    expect(out).toContain('日期：2026-09-27')
    expect(out).toContain('ISO 周数：2026-W')
    expect(out).toContain('该周周一：2026-09-21')
    expect(out).toContain('该周周日：2026-09-27')
  })

  it('跨周边界：2025-12-31 显示为 2026-W01', () => {
    const out = transform({ text: '2025-12-31' }, empty)
    expect(out).toContain('ISO 周数：2026-W01')
  })

  it('越界日期报错', () => {
    expect(() => transform({ text: '2024-02-30' }, empty)).toThrow(/日期越界/)
  })

  it('输入超过上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, empty)).toThrow(/上限/)
  })
})
