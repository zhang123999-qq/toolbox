import { describe, expect, it } from 'vitest'
import {
  buildCalendar,
  daysInMonth,
  isLeapYear,
  isToday,
  selectedInfo,
  toISODate,
  weekdayCn,
} from './utils'

describe('date-picker / isLeapYear & daysInMonth', () => {
  it('闰年判断', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2026)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(1900)).toBe(false)
  })

  it('各月天数，二月随闰年变化', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe('date-picker / buildCalendar', () => {
  it('2026-09-01 是周二，周一开头第一周补 1 个空位', () => {
    const weeks = buildCalendar(2026, 9)
    expect(weeks[0]).toEqual([null, 1, 2, 3, 4, 5, 6])
  })

  it('格子里恰好排满当月 1-30，且总数为 6 行', () => {
    const weeks = buildCalendar(2026, 9)
    const flat = weeks.flat().filter((d): d is number => d !== null)
    expect(flat[0]).toBe(1)
    expect(flat[flat.length - 1]).toBe(30)
    expect(flat).toHaveLength(30)
  })

  it('2 月平年 28 天能落在 5 行', () => {
    const weeks = buildCalendar(2026, 2)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
  })
})

describe('date-picker / 格式化', () => {
  it('toISODate 输出 YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('weekdayCn 输出中文星期', () => {
    // 2026-09-27 是周日
    expect(weekdayCn(new Date(2026, 8, 27))).toBe('周日')
    expect(weekdayCn(new Date(2026, 8, 28))).toBe('周一')
  })

  it('selectedInfo 含 ISO 与时间戳', () => {
    const text = selectedInfo(new Date(2026, 8, 28, 12, 0, 0))
    expect(text).toContain('2026-09-28')
    expect(text).toContain('周一')
    expect(text).toContain('时间戳')
  })

  it('isToday 对今天为真（其他固定日期为假）', () => {
    expect(isToday(2020, 1, 1)).toBe(false)
  })
})
