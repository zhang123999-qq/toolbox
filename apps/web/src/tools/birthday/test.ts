import { describe, expect, it } from 'vitest'
import { isLeapYear, nextBirthdayDate, parseBirthday, transform } from './utils'

const empty = {}

describe('birthday / parseBirthday', () => {
  it('只给月日', () => {
    expect(parseBirthday('05-20')).toMatchObject({ month0: 4, day: 20, birthYear: null })
    expect(parseBirthday('12/25')).toMatchObject({ month0: 11, day: 25, birthYear: null })
  })

  it('给完整日期', () => {
    expect(parseBirthday('1990-05-20')).toMatchObject({
      month0: 4,
      day: 20,
      birthYear: 1990,
    })
  })

  it('越界日期报错', () => {
    expect(() => parseBirthday('02-30')).toThrow(/日期越界/)
    expect(() => parseBirthday('13-01')).toThrow(/月份越界/)
    expect(() => parseBirthday('abc')).toThrow(/无法解析/)
  })
})

describe('birthday / nextBirthdayDate', () => {
  it('今年未到 → 今年', () => {
    const now = new Date(2026, 0, 15) // 1-15
    const { date } = nextBirthdayDate(now, 4, 20) // 5-20
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(4)
    expect(date.getDate()).toBe(20)
  })

  it('今年已过 → 明年', () => {
    const now = new Date(2026, 10, 20) // 11-20
    const { date } = nextBirthdayDate(now, 4, 20) // 5-20
    expect(date.getFullYear()).toBe(2027)
  })

  it('今天就是生日 → 今天', () => {
    const now = new Date(2026, 8, 27) // 9-27
    const { date } = nextBirthdayDate(now, 8, 27)
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(27)
  })

  it('2-29 生日在平年回退到 2-28', () => {
    const now = new Date(2026, 0, 1) // 2026 平年
    const { date, leapFallback } = nextBirthdayDate(now, 1, 29)
    expect(leapFallback).toBe(true)
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(1)
    expect(date.getDate()).toBe(28)
  })

  it('2-29 生日在闰年仍是 2-29', () => {
    const now = new Date(2028, 0, 1) // 2028 闰年
    const { date, leapFallback } = nextBirthdayDate(now, 1, 29)
    expect(leapFallback).toBe(false)
    expect(date.getDate()).toBe(29)
  })

  it('isLeapYear 规则', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2026)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(1900)).toBe(false)
  })
})

describe('birthday / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('只给月日 → 输出倒计时与星期', () => {
    const out = transform({ text: '05-20' }, empty)
    expect(out).toContain('生日：05-20')
    expect(out).toContain('下一次生日：')
    expect(out).toContain('倒计时：')
    expect(out).not.toContain('届时将满')
  })

  it('带年份 → 输出届时周岁', () => {
    const out = transform({ text: '1990-05-20' }, empty)
    expect(out).toContain('1990 年生')
    expect(out).toContain('届时将满')
  })

  it('越界日期报错', () => {
    expect(() => transform({ text: '02-30' }, empty)).toThrow(/日期越界/)
  })

  it('输入超过上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, empty)).toThrow(/上限/)
  })
})
