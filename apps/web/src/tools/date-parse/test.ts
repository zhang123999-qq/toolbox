import { describe, expect, it } from 'vitest'
import { addDays, parseNaturalDate, today, transform } from './utils'

// 基准：2026-09-27 是星期日（monIndex=6）
const base = new Date(2026, 8, 27)
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('date-parse / 绝对日期', () => {
  it('三种写法解析同一天', () => {
    expect(fmt(parseNaturalDate('2026-09-27', base))).toBe('2026-09-27')
    expect(fmt(parseNaturalDate('2026/9/27', base))).toBe('2026-09-27')
    expect(fmt(parseNaturalDate('2026年9月27日', base))).toBe('2026-09-27')
  })

  it('非法日期（非闰年 2/29）抛错', () => {
    expect(() => parseNaturalDate('2026-02-29', base)).toThrow(/非法日期/)
  })
})

describe('date-parse / 相对日期', () => {
  it('今天 / 明天 / 大后天', () => {
    expect(fmt(parseNaturalDate('今天', base))).toBe('2026-09-27')
    expect(fmt(parseNaturalDate('明天', base))).toBe('2026-09-28')
    expect(fmt(parseNaturalDate('大后天', base))).toBe('2026-09-30')
  })

  it('昨天 / 前天', () => {
    expect(fmt(parseNaturalDate('昨天', base))).toBe('2026-09-26')
    expect(fmt(parseNaturalDate('前天', base))).toBe('2026-09-25')
  })

  it('n 天后 / n 天前', () => {
    expect(fmt(parseNaturalDate('3天后', base))).toBe('2026-09-30')
    expect(fmt(parseNaturalDate('5天前', base))).toBe('2026-09-22')
  })

  it('周日为基准时，下周一 = 明天', () => {
    expect(fmt(parseNaturalDate('下周一', base))).toBe('2026-09-28')
    expect(fmt(parseNaturalDate('下周', base))).toBe('2026-09-28')
  })

  it('裸周X = 下一次出现（含今天）', () => {
    // 今天周日，裸周日命中今天
    expect(fmt(parseNaturalDate('周日', base))).toBe('2026-09-27')
    expect(fmt(parseNaturalDate('周五', base))).toBe('2026-10-02')
  })

  it('本周X 取本周内', () => {
    expect(fmt(parseNaturalDate('本周日', base))).toBe('2026-09-27')
    expect(fmt(parseNaturalDate('本周三', base))).toBe('2026-09-23')
  })
})

describe('date-parse / 工具函数', () => {
  it('addDays 跨月正确', () => {
    expect(fmt(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01')
  })

  it('today() 归零时分秒', () => {
    const t = today(new Date(2026, 8, 27, 15, 30, 45))
    expect(t.getHours()).toBe(0)
  })
})

describe('date-parse / transform', () => {
  it('输出解析结果 + 相对偏移 + 年积日', () => {
    const out = transform({ text: '明天' }, {})
    expect(out).toContain('解析结果：')
    expect(out).toContain('相对今天：+1 天')
    expect(out).toContain('当年第 ')
  })

  it('解析不了抛中文错误', () => {
    expect(() => transform({ text: '火星下周三' }, {})).toThrow(/无法解析的日期/)
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('输入超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
