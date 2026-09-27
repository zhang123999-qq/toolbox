import { describe, expect, it } from 'vitest'
import { diffParts, parseDate, transform } from './utils'

const empty = {}

describe('date-diff / diffParts', () => {
  it('同年同月同日差为 0', () => {
    const p = diffParts(parseDate('2024-06-15'), parseDate('2024-06-15'))
    expect(p).toMatchObject({ years: 0, months: 0, days: 0, sign: 1 })
  })

  it('跨整年：2023-01-01 → 2024-01-01 = 1 年', () => {
    const p = diffParts(parseDate('2023-01-01'), parseDate('2024-01-01'))
    expect(p).toMatchObject({ years: 1, months: 0, days: 0 })
  })

  it('跨月借位：2024-03-15 → 2024-05-20 = 2 个月 5 天', () => {
    const p = diffParts(parseDate('2024-03-15'), parseDate('2024-05-20'))
    expect(p.years).toBe(0)
    expect(p.months).toBe(2)
    expect(p.days).toBe(5)
  })

  it('跨年借位：2024-12-15 → 2025-01-10', () => {
    const p = diffParts(parseDate('2024-12-15'), parseDate('2025-01-10'))
    expect(p.years).toBe(0)
    expect(p.months).toBe(0)
    expect(p.days).toBe(26)
  })

  it('闰年影响：2024-02-28 → 2024-03-01 = 2 天（闰年）', () => {
    const p = diffParts(parseDate('2024-02-28'), parseDate('2024-03-01'))
    expect(p.days).toBe(2)
    const p2 = diffParts(parseDate('2023-02-28'), parseDate('2023-03-01'))
    expect(p2.days).toBe(1)
  })

  it('反向日期 sign = -1，绝对值对称', () => {
    const p1 = diffParts(parseDate('2024-01-01'), parseDate('2024-03-01'))
    const p2 = diffParts(parseDate('2024-03-01'), parseDate('2024-01-01'))
    expect(p1.sign).toBe(1)
    expect(p2.sign).toBe(-1)
    expect(p2.years).toBe(p1.years)
    expect(p2.months).toBe(p1.months)
    expect(p2.days).toBe(p1.days)
  })

  it('长月末到短月后月初：1/31 → 3/1 不得出现负数天数', () => {
    // 借 2 月(28 天) 后 days 仍为 -2，必须继续借 1 月(31 天) 才转正
    const p = diffParts(parseDate('2025-01-31'), parseDate('2025-03-01'))
    expect(p.years).toBe(0)
    expect(p.months).toBe(0)
    expect(p.days).toBe(29)
    expect(p.days).toBeGreaterThanOrEqual(0)
  })

  it('闰年 1/31 → 3/1 借位正确', () => {
    const p = diffParts(parseDate('2024-01-31'), parseDate('2024-03-01'))
    expect(p.months).toBe(0)
    expect(p.days).toBe(30)
    expect(p.days).toBeGreaterThanOrEqual(0)
  })
})

describe('date-diff / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, empty)).toBe('')
    expect(transform({ text: '2024-01-01', textB: '' }, empty)).toBe('')
  })

  it('输出总量与复合间隔', () => {
    const out = transform({ text: '2024-01-01', textB: '2024-01-08' }, empty)
    expect(out).toContain('复合间隔：0 年 0 个月 7 天')
    expect(out).toContain('总天数：7 天')
    expect(out).toContain('总小时：168 小时')
  })

  it('跨年总天数正确（含闰年）', () => {
    const out = transform({ text: '2024-01-01', textB: '2025-01-01' }, empty)
    expect(out).toContain('复合间隔：1 年 0 个月 0 天')
    // 2024 是闰年，366 天
    expect(out).toContain('总天数：366 天')
  })

  it('反向方向标注', () => {
    const out = transform({ text: '2025-01-01', textB: '2024-01-01' }, empty)
    expect(out).toContain('B 早于 A')
  })

  it('非法日期报错', () => {
    expect(() => transform({ text: '2024-02-30', textB: '2024-03-01' }, empty)).toThrow(/日期越界/)
    expect(() => transform({ text: 'garbage', textB: '2024-03-01' }, empty)).toThrow(/无法解析/)
  })

  it('输入超过上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001), textB: '2024-01-01' }, empty)).toThrow(
      /上限/,
    )
  })
})
