import { describe, expect, it } from 'vitest'
import type { LunarOptions } from './schema'
import {
  LUNAR_INFO,
  cnDay,
  cnMonth,
  leapDays,
  leapMonth,
  lunar2solar,
  monthDays,
  solar2lunar,
  transform,
  yearDays,
} from './utils'

const s2l: LunarOptions = { direction: 'solar2lunar' }
const l2s: LunarOptions = { direction: 'lunar2solar' }

describe('lunar / 表与解码', () => {
  it('表共 201 条（1900–2100）', () => {
    expect(LUNAR_INFO).toHaveLength(201)
  })

  it('已知闰月：2023 闰二月、2025 闰六月、2020 闰四月', () => {
    expect(leapMonth(2023)).toBe(2)
    expect(leapMonth(2025)).toBe(6)
    expect(leapMonth(2020)).toBe(4)
  })

  it('2024 无闰月', () => {
    expect(leapMonth(2024)).toBe(0)
  })

  it('月天数在 29/30 之间', () => {
    for (const y of [1900, 2000, 2023, 2025, 2100]) {
      for (let m = 1; m <= 12; m++) {
        expect([29, 30]).toContain(monthDays(y, m))
      }
      // 平年（12 个月）约 354/355 天，闰年（13 个月）约 383–385 天
      const yd = yearDays(y)
      expect(yd >= 353 && yd <= 385).toBe(true)
    }
  })
})

describe('lunar / 公历→农历（已知对照锚点）', () => {
  it('2025-01-29 = 正月初一（乙巳蛇年春节）', () => {
    const r = solar2lunar(2025, 1, 29)
    expect(r.month).toBe(1)
    expect(r.day).toBe(1)
    expect(r.isLeap).toBe(false)
    expect(r.ganzhi).toBe('乙巳')
    expect(r.animal).toBe('蛇')
  })

  it('2024-02-10 = 正月初一（甲辰龙年春节）', () => {
    const r = solar2lunar(2024, 2, 10)
    expect(r.month).toBe(1)
    expect(r.day).toBe(1)
    expect(r.ganzhi).toBe('甲辰')
  })

  it('2023-03-22 = 闰二月初一', () => {
    const r = solar2lunar(2023, 3, 22)
    expect(r.month).toBe(2)
    expect(r.day).toBe(1)
    expect(r.isLeap).toBe(true)
  })

  it('2023 正常二月初一在闰二月之前（2023-02-20）', () => {
    const r = solar2lunar(2023, 2, 20)
    expect(r.month).toBe(2)
    expect(r.day).toBe(1)
    expect(r.isLeap).toBe(false)
  })

  it('2025-10-06 = 中秋（八月十五）', () => {
    const r = solar2lunar(2025, 10, 6)
    expect(r.month).toBe(8)
    expect(r.day).toBe(15)
  })
})

describe('lunar / 农历→公历 回环一致', () => {
  it('对若干公历日期往返一致', () => {
    for (const [y, m, d] of [
      [2025, 1, 29],
      [2023, 3, 22],
      [2024, 2, 10],
      [2000, 1, 1],
      [1988, 12, 31],
      [2049, 10, 1],
    ]) {
      const r = solar2lunar(y, m, d)
      const back = lunar2solar(r.year, r.month, r.day, r.isLeap)
      expect(back).toEqual({ y, m, d })
    }
  })

  it('直接：2023 闰二月初一 = 2023-03-22', () => {
    expect(lunar2solar(2023, 2, 1, true)).toEqual({ y: 2023, m: 3, d: 22 })
  })

  it('2025 正月初一 = 2025-01-29', () => {
    expect(lunar2solar(2025, 1, 1, false)).toEqual({ y: 2025, m: 1, d: 29 })
  })
})

describe('lunar / 中文命名', () => {
  it('月名与日名', () => {
    expect(cnMonth(1, false)).toBe('正月')
    expect(cnMonth(2, true)).toBe('闰二月')
    expect(cnDay(1)).toBe('初一')
    expect(cnDay(15)).toBe('十五')
    expect(cnDay(23)).toBe('廿三')
    expect(cnDay(30)).toBe('三十')
  })

  it('十月/冬月/腊月 不得错位（锁定 CN_MONTH 12 项）', () => {
    expect(cnMonth(10, false)).toBe('十月')
    expect(cnMonth(11, false)).toBe('冬月')
    expect(cnMonth(12, false)).toBe('腊月')
  })

  it('2024-11-01 是农历十月初一（不是冬月）', () => {
    const r = solar2lunar(2024, 11, 1)
    expect(r.month).toBe(10)
    expect(r.day).toBe(1)
    expect(cnMonth(r.month, r.isLeap)).toBe('十月')
  })

  it('2100-12-31 腊月不得输出 undefined', () => {
    const out = transform({ text: '2100-12-31' }, s2l)
    expect(out).not.toContain('undefined')
    expect(out).toContain('腊月')
  })
})

describe('lunar / transform 与边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, s2l)).toBe('')
  })

  it('公历→农历输出多行', () => {
    const out = transform({ text: '2025-01-29' }, s2l)
    expect(out).toContain('2025-01-29')
    expect(out).toContain('正月初一')
    expect(out).toContain('乙巳')
  })

  it('农历→公历：2023-闰2-1 得到 3-22', () => {
    const out = transform({ text: '2023-闰2-1' }, l2s)
    expect(out).toContain('2023-03-22')
  })

  it('早于 1900-01-31 抛错', () => {
    expect(() => transform({ text: '1900-01-01' }, s2l)).toThrow(/超出/)
  })

  it('越界年份抛中文错误', () => {
    expect(() => transform({ text: '2200-01-01' }, s2l)).toThrow(/范围|非法/)
    expect(() => transform({ text: '1800-01-01' }, s2l)).toThrow(/范围|非法/)
  })

  it('公历 2 月 30 日必须抛错（不得静默进位成 3 月）', () => {
    expect(() => transform({ text: '2023-02-30' }, s2l)).toThrow(/非法|范围/)
  })

  it('非法闰月组合抛错', () => {
    expect(() => lunar2solar(2024, 2, 1, true)).toThrow(/没有闰/)
  })

  it('超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, s2l)).toThrow(/上限/)
  })
})

describe('lunar / 闰月天数', () => {
  it('2023 闰二月天数被正确解码', () => {
    expect(leapMonth(2023)).toBe(2)
    expect([29, 30]).toContain(leapDays(2023))
  })
})
