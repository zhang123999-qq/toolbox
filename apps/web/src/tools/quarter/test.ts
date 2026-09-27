import { describe, expect, it } from 'vitest'
import { parseDate, quarterInfo, transform } from './utils'

describe('quarter / quarterInfo', () => {
  it('9 月属 Q3，起止 07-01 ~ 09-30', () => {
    const q = quarterInfo(2026, 9, 27)
    expect(q.quarter).toBe(3)
    expect(q.start).toBe('2026-07-01')
    expect(q.end).toBe('2026-09-30')
  })

  it('各月归入正确季度', () => {
    expect(quarterInfo(2026, 1, 15).quarter).toBe(1)
    expect(quarterInfo(2026, 3, 31).quarter).toBe(1)
    expect(quarterInfo(2026, 4, 1).quarter).toBe(2)
    expect(quarterInfo(2026, 6, 30).quarter).toBe(2)
    expect(quarterInfo(2026, 7, 1).quarter).toBe(3)
    expect(quarterInfo(2026, 10, 1).quarter).toBe(4)
    expect(quarterInfo(2026, 12, 31).quarter).toBe(4)
  })

  it('季度末天数正确（Q3 末即 9-30）', () => {
    expect(quarterInfo(2026, 9, 30).daysToEnd).toBe(1)
    expect(quarterInfo(2026, 9, 27).daysToEnd).toBe(4)
    expect(quarterInfo(2026, 12, 31).daysToEnd).toBe(1)
  })

  it('Q2 末为 6-30（小月）', () => {
    expect(quarterInfo(2026, 5, 1).end).toBe('2026-06-30')
  })

  it('当年进度在 0~100 之间，年初≈0、年末≈100', () => {
    expect(quarterInfo(2026, 1, 1).yearProgress).toBeGreaterThan(0)
    expect(quarterInfo(2026, 1, 1).yearProgress).toBeLessThan(1)
    expect(quarterInfo(2026, 12, 31).yearProgress).toBeGreaterThan(99.5)
    // 6-27 为年积日 178，进度 ≈ 48.8%
    expect(quarterInfo(2026, 6, 27).yearProgress).toBeGreaterThan(48)
    expect(quarterInfo(2026, 6, 27).yearProgress).toBeLessThan(50)
  })
})

describe('quarter / parseDate & transform', () => {
  it('解析合法日期', () => {
    expect(parseDate('2026-09-27')).toEqual({ y: 2026, m: 9, d: 27 })
  })

  it('非法日期抛错', () => {
    expect(() => parseDate('2026-02-30')).toThrow(/非法日期/)
    expect(() => parseDate('nope')).toThrow(/无法识别/)
  })

  it('transform 输出季度与进度', () => {
    const out = transform({ text: '2026-09-27' }, {})
    expect(out).toContain('所属季度：Q3')
    expect(out).toContain('季度起止：2026-07-01 ~ 2026-09-30')
    expect(out).toContain('距季度末：4 天')
    expect(out).toContain('当年进度：')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
