import { describe, expect, it } from 'vitest'
import { illumination, moonAge, nextEvents, parseMoonDate, phaseName, transform } from './utils'

describe('moon-phase / moonAge & illumination', () => {
  it('月龄始终落在 [0, 29.53059)', () => {
    for (const [y, m, d] of [
      [2000, 1, 6],
      [2025, 6, 21],
      [2025, 10, 6],
      [2026, 1, 1],
      [2030, 12, 31],
    ]) {
      const age = moonAge(y, m, d)
      expect(age).toBeGreaterThanOrEqual(0)
      expect(age).toBeLessThan(29.53059)
    }
  })

  it('照明比例始终落在 0~100', () => {
    for (let age = 0; age < 29.53; age += 0.5) {
      const i = illumination(age)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThanOrEqual(100)
    }
  })

  it('新月时照明 ≈ 0，满月时照明 ≈ 100', () => {
    expect(illumination(0)).toBeLessThan(1)
    expect(illumination(29.530588853 / 2)).toBeGreaterThan(99)
  })

  it('2025-10-06 为满月附近（照明 > 90%，月相=满月）', () => {
    const age = moonAge(2025, 10, 6)
    expect(illumination(age)).toBeGreaterThan(90)
    expect(phaseName(age)).toBe('满月')
  })

  it('已知新月附近照明 ≈ 0（2025-12-20）', () => {
    const age = moonAge(2025, 12, 20)
    expect(illumination(age)).toBeLessThan(2)
  })
})

describe('moon-phase / phaseName', () => {
  it('月龄 0 → 新月，7.4 → 上弦月，14.8 → 满月，22.2 → 下弦月', () => {
    expect(phaseName(0)).toBe('新月')
    expect(phaseName(3.0)).toBe('蛾眉月')
    expect(phaseName(7.4)).toBe('上弦月')
    expect(phaseName(11.0)).toBe('盈凸月')
    expect(phaseName(14.8)).toBe('满月')
    expect(phaseName(18.5)).toBe('亏凸月')
    expect(phaseName(22.2)).toBe('下弦月')
    expect(phaseName(26.0)).toBe('残月')
  })
})

describe('moon-phase / nextEvents', () => {
  it('2025-09-15 之后下一次满月为 2025-10-07 前后、下一次新月为 2025-09-22 前后', () => {
    const n = nextEvents(2025, 9, 15)
    expect(n.nextFull).toMatch(/^2025-10-0[5-9]$/)
    expect(n.nextNew).toMatch(/^2025-09-2[0-5]$/)
  })

  it('下一次事件日期严格晚于输入日', () => {
    const n = nextEvents(2026, 1, 1)
    expect(n.nextFull > '2026-01-01').toBe(true)
    expect(n.nextNew > '2026-01-01').toBe(true)
  })
})

describe('moon-phase / parseMoonDate & transform', () => {
  it('解析合法日期', () => {
    expect(parseMoonDate('2025-10-06')).toEqual({ y: 2025, m: 10, d: 6 })
  })

  it('非法日期抛错', () => {
    expect(() => parseMoonDate('2025-02-30')).toThrow(/非法日期/)
    expect(() => parseMoonDate('not-a-date')).toThrow(/无法识别/)
  })

  it('transform 输出月龄/照明/月相/下次事件', () => {
    const out = transform({ text: '2025-10-06' }, {})
    expect(out).toContain('月龄：')
    expect(out).toContain('照明比例：')
    expect(out).toContain('月相：满月')
    expect(out).toContain('下一次满月：')
    expect(out).toContain('下一次新月：')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
    expect(transform({ text: '   ' }, {})).toBe('')
  })

  it('输入超过上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })

  it('非法日期进入错误态（抛错）', () => {
    expect(() => transform({ text: 'hello' }, {})).toThrow(/无法识别/)
  })
})
