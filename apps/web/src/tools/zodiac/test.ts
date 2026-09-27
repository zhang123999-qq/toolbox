import { describe, expect, it } from 'vitest'
import type { ZodiacOptions } from './schema'
import { ZODIAC, findZodiac, parseBirthday, transform } from './utils'

const base: ZodiacOptions = {}

describe('zodiac / findZodiac（边界归属）', () => {
  it('3/20 交界归双鱼，3/21 才进白羊', () => {
    expect(findZodiac(3, 20).en).toBe('Pisces')
    expect(findZodiac(3, 21).en).toBe('Aries')
  })

  it('1/1–1/19 归摩羯（跨年）', () => {
    expect(findZodiac(1, 1).en).toBe('Capricorn')
    expect(findZodiac(1, 19).en).toBe('Capricorn')
    expect(findZodiac(1, 20).en).toBe('Aquarius')
  })

  it('12/22 起进入摩羯', () => {
    expect(findZodiac(12, 21).en).toBe('Sagittarius')
    expect(findZodiac(12, 22).en).toBe('Capricorn')
  })

  it('每个月都能命中且表内恰好 12 个', () => {
    expect(ZODIAC).toHaveLength(12)
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    for (const m of months) expect(findZodiac(m, 15)).toBeTruthy()
  })

  it('典型日期命中间名', () => {
    expect(findZodiac(7, 15).zh).toBe('巨蟹座')
    expect(findZodiac(10, 1).zh).toBe('天秤座')
    expect(findZodiac(11, 1).zh).toBe('天蝎座')
  })
})

describe('zodiac / parseBirthday', () => {
  it('支持多种分隔符与带年份写法', () => {
    expect(parseBirthday('3/21')).toEqual({ month: 3, day: 21 })
    expect(parseBirthday('3-21')).toEqual({ month: 3, day: 21 })
    expect(parseBirthday('2025-03-21')).toEqual({ month: 3, day: 21 })
  })

  it('非法月日抛中文错误', () => {
    expect(() => parseBirthday('13/1')).toThrow(/月份/)
    expect(() => parseBirthday('2/30')).toThrow(/非法日期/)
    expect(() => parseBirthday('hello')).toThrow(/无法识别/)
  })
})

describe('zodiac / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('正常输出中英名 + 区间 + 元素 + 特质', () => {
    const out = transform({ text: '3/21' }, base)
    expect(out).toContain('白羊座')
    expect(out).toContain('Aries')
    expect(out).toContain('3/21 – 4/19')
    expect(out).toContain('火（Fire）')
  })

  it('非法输入进入错误文案', () => {
    expect(() => transform({ text: '99/99' }, base)).toThrow(/月份|非法/)
  })

  it('超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
