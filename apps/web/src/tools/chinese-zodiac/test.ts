import { describe, expect, it } from 'vitest'
import type { ChineseZodiacOptions } from './schema'
import {
  ANIMALS,
  BRANCHES,
  MAX_YEAR,
  MIN_YEAR,
  STEMS,
  lookupYear,
  parseYear,
  transform,
} from './utils'

const base: ChineseZodiacOptions = {}

describe('chinese-zodiac / lookupYear（锚点）', () => {
  it('2020 庚子鼠、2024 甲辰龙、2025 乙巳蛇', () => {
    expect(lookupYear(2020).animalZh).toBe('鼠')
    expect(lookupYear(2020).ganzhi).toBe('庚子')
    expect(lookupYear(2024).animalZh).toBe('龙')
    expect(lookupYear(2024).ganzhi).toBe('甲辰')
    expect(lookupYear(2025).animalZh).toBe('蛇')
    expect(lookupYear(2025).ganzhi).toBe('乙巳')
  })

  it('边界年份 1900 庚子鼠、2100 庚申猴', () => {
    expect(lookupYear(1900).ganzhi).toBe('庚子')
    expect(lookupYear(1900).animalZh).toBe('鼠')
    // 2100: (2100-4)=2096; 2096%12=8→猴(申), 2096%10=6→庚
    expect(lookupYear(2100).ganzhi).toBe('庚申')
    expect(lookupYear(2100).animalZh).toBe('猴')
  })

  it('生肖排序与地支同位', () => {
    const r = lookupYear(2025)
    expect(r.branch).toBe('巳')
    expect(r.order).toBe(6)
  })

  it('五行随天干：甲乙木、庚辛金、壬癸水', () => {
    expect(lookupYear(2024).element).toBe('木') // 甲
    expect(lookupYear(2025).element).toBe('木') // 乙
    expect(lookupYear(2020).element).toBe('金') // 庚
    expect(lookupYear(2023).element).toBe('水') // 癸
  })

  it('十二年一轮回，六十年一甲子', () => {
    for (let y = 1900; y + 12 <= 2100; y += 12) {
      expect(lookupYear(y).animalZh).toBe(lookupYear(y + 12).animalZh)
    }
    expect(lookupYear(1984).ganzhi).toBe('甲子')
    expect(lookupYear(2044).ganzhi).toBe('甲子')
  })
})

describe('chinese-zodiac / parseYear', () => {
  it('识别四位年份', () => {
    expect(parseYear('2025')).toBe(2025)
    expect(parseYear(' 1999 ')).toBe(1999)
  })

  it('越界年份抛中文错误', () => {
    expect(() => parseYear('1899')).toThrow(/覆盖范围/)
    expect(() => parseYear('2101')).toThrow(/覆盖范围/)
  })

  it('非法输入抛错', () => {
    expect(() => parseYear('abc')).toThrow(/无法识别/)
  })

  it('常量完整', () => {
    expect(ANIMALS).toHaveLength(12)
    expect(STEMS).toHaveLength(10)
    expect(BRANCHES).toHaveLength(12)
    expect(MIN_YEAR).toBe(1900)
    expect(MAX_YEAR).toBe(2100)
  })
})

describe('chinese-zodiac / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('输出中英生肖 + 干支 + 五行 + 排序', () => {
    const out = transform({ text: '2025' }, base)
    expect(out).toContain('蛇（Snake）')
    expect(out).toContain('乙巳')
    expect(out).toContain('木（Wood）')
    expect(out).toContain('第 6 位')
  })

  it('越界进入错误态', () => {
    expect(() => transform({ text: '1800' }, base)).toThrow(/覆盖范围/)
  })

  it('超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
