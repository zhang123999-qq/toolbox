import { describe, expect, it } from 'vitest'
import { formatDuration, parseDateTime, transform } from './utils'

interface Opts {
  title: string
}
const baseOpts: Opts = { title: '测试' }

describe('countdown / parseDateTime', () => {
  it('解析带时间的日期', () => {
    const d = parseDateTime('2027-01-01 08:30:00')
    expect(d.getFullYear()).toBe(2027)
    expect(d.getHours()).toBe(8)
  })

  it('越界日期报错', () => {
    expect(() => parseDateTime('2024-02-30 00:00:00')).toThrow(/日期越界/)
    expect(() => parseDateTime('2024-01-01 25:00:00')).toThrow(/时间越界/)
  })
})

describe('countdown / formatDuration', () => {
  it('正数与负数绝对值对称', () => {
    const ms = 2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5 * 1000
    expect(formatDuration(ms)).toBe('2 天 03:04:05')
    expect(formatDuration(-ms)).toBe('2 天 03:04:05')
  })

  it('不足一天补零', () => {
    expect(formatDuration(3_600_000)).toBe('0 天 01:00:00')
  })
})

describe('countdown / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, baseOpts)).toBe('')
  })

  it('未来目标显示剩余', () => {
    const out = transform({ text: '2999-01-01 00:00:00', textB: '' }, baseOpts)
    expect(out).toContain('标题：测试')
    expect(out).toContain('状态：未开始')
    expect(out).toContain('剩余：')
  })

  it('过去目标显示已过期', () => {
    const out = transform({ text: '2000-01-01 00:00:00', textB: '' }, baseOpts)
    expect(out).toContain('状态：已过期')
    expect(out).toContain('已过去：')
  })

  it('给开始日期后输出进度百分比', () => {
    // 开始 2020-01-01，目标 2030-01-01，现在 2026-09-27 ≈ 69.6%
    const out = transform({ text: '2030-01-01 00:00:00', textB: '2020-01-01 00:00:00' }, baseOpts)
    expect(out).toContain('开始：')
    expect(out).toContain('进度：')
    // 百分比应在 0-100 之间
    const m = out.match(/进度：([\d.]+)%/)
    expect(m).not.toBeNull()
    const pct = Number(m![1])
    expect(pct).toBeGreaterThan(0)
    expect(pct).toBeLessThanOrEqual(100)
  })

  it('开始日期不早于目标时给出提示', () => {
    const out = transform({ text: '2020-01-01 00:00:00', textB: '2030-01-01 00:00:00' }, baseOpts)
    expect(out).toContain('无法计算百分比')
  })

  it('越界日期报错', () => {
    expect(() => transform({ text: '2024-02-30', textB: '' }, baseOpts)).toThrow(/日期越界/)
  })

  it('输入超过上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001), textB: '' }, baseOpts)).toThrow(/上限/)
  })
})
