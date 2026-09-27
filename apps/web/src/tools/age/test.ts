import { describe, expect, it } from 'vitest'
import { ageParts, nextBirthday, parseDate, transform, westernZodiac, zodiac } from './utils'

const empty = {}

describe('age / 生肖 (year-4)%12', () => {
  it('2020 为鼠年（基准 4 年为鼠）', () => {
    expect(zodiac(2020)).toBe('鼠')
    expect(zodiac(2021)).toBe('牛')
    expect(zodiac(2022)).toBe('虎')
    expect(zodiac(2024)).toBe('龙')
  })

  it('公元前/早年回绕正确', () => {
    expect(zodiac(2008)).toBe('鼠')
    expect(zodiac(1995)).toBe('猪')
  })
})

describe('age / 星座月日区间', () => {
  it('边界日期落在后一个星座', () => {
    expect(westernZodiac(0, 19)).toBe('摩羯座') // 1-19
    expect(westernZodiac(0, 20)).toBe('水瓶座') // 1-20
    expect(westernZodiac(4, 20)).toBe('金牛座') // 5-20
    expect(westernZodiac(4, 21)).toBe('双子座') // 5-21
  })

  it('摩羯跨年末年初', () => {
    expect(westernZodiac(11, 22)).toBe('摩羯座') // 12-22
    expect(westernZodiac(11, 21)).toBe('射手座') // 12-21
  })

  it('常见星座', () => {
    expect(westernZodiac(7, 15)).toBe('狮子座') // 8-15
    expect(westernZodiac(9, 15)).toBe('天秤座') // 10-15
    expect(westernZodiac(4, 1)).toBe('金牛座') // 5-1
  })
})

describe('age / ageParts 精确到天', () => {
  it('正好周岁', () => {
    const p = ageParts(parseDate('2000-06-15'), parseDate('2020-06-15'))
    expect(p).toMatchObject({ years: 20, months: 0, days: 0 })
  })

  it('差几天到生日', () => {
    const p = ageParts(parseDate('2000-06-15'), parseDate('2020-06-10'))
    expect(p.years).toBe(19)
    expect(p.months).toBe(11)
    expect(p.days).toBe(26)
  })

  it('跨月借位', () => {
    const p = ageParts(parseDate('2020-01-15'), parseDate('2020-03-01'))
    expect(p.years).toBe(0)
    // 1/15 -> 2/15 = 1 个月，再到 3/1 = 15 天
    expect(p.months).toBe(1)
    expect(p.days).toBe(15)
  })

  it('出生于 31 日、参考日落在短月不得出现负数天数', () => {
    // 2000-01-31 出生，2025-03-01 参考：借 2 月(28) 后仍为负，需继续借 1 月
    const p = ageParts(parseDate('2000-01-31'), parseDate('2025-03-01'))
    expect(p.years).toBe(25)
    expect(p.months).toBe(0)
    expect(p.days).toBe(29)
    expect(p.days).toBeGreaterThanOrEqual(0)
  })

  it('生日晚于参考日应报错', () => {
    expect(() => ageParts(parseDate('2030-01-01'), parseDate('2020-01-01'))).toThrow(/晚于参考日期/)
  })
})

describe('age / nextBirthday', () => {
  it('今天是生日 → 0 天', () => {
    const ref = parseDate('2026-09-27')
    const next = nextBirthday(ref, 8, 27)
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(8)
    expect(next.getDate()).toBe(27)
  })

  it('已过生日 → 明年', () => {
    const ref = parseDate('2026-09-27')
    const next = nextBirthday(ref, 0, 1) // 1-1
    expect(next.getFullYear()).toBe(2027)
    expect(next.getMonth()).toBe(0)
    expect(next.getDate()).toBe(1)
  })

  it('2-29 生日在平年回退到 2-28', () => {
    const ref = parseDate('2026-01-01') // 2026 平年
    const next = nextBirthday(ref, 1, 29)
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(1)
    expect(next.getDate()).toBe(28)
  })
})

describe('age / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, empty)).toBe('')
  })

  it('输出年龄/生肖/星座/距生日', () => {
    const out = transform({ text: '2000-05-20', textB: '2026-09-27' }, empty)
    expect(out).toContain('出生日期：2000-05-20')
    expect(out).toContain('生肖：龙')
    expect(out).toContain('星座：金牛座')
    expect(out).toContain('距下一个生日：')
  })

  it('越界日期报错', () => {
    expect(() => transform({ text: '2000-02-30', textB: '' }, empty)).toThrow(/日期越界/)
  })

  it('出生晚于参考日报错', () => {
    expect(() => transform({ text: '2030-01-01', textB: '2020-01-01' }, empty)).toThrow(
      /晚于参考日期/,
    )
  })
})
