import { describe, expect, it } from 'vitest'
import { MS_THRESHOLD, detectUnit, isTimestamp, parseDate, transform } from './utils'

describe('timestamp-convert / 单位识别', () => {
  it('整数串才被当作时间戳', () => {
    expect(isTimestamp('1790494200')).toBe(true)
    expect(isTimestamp('-31536000')).toBe(true)
    expect(isTimestamp('1790494200.0')).toBe(false)
    expect(isTimestamp('2026-09-27')).toBe(false)
  })

  it('1e12 阈值：小于按秒，大于等于按毫秒（含负数）', () => {
    expect(detectUnit(MS_THRESHOLD - 1)).toBe('s')
    expect(detectUnit(MS_THRESHOLD)).toBe('ms')
    expect(detectUnit(MS_THRESHOLD + 1)).toBe('ms')
    expect(detectUnit(-MS_THRESHOLD)).toBe('ms')
    expect(detectUnit(-1)).toBe('s')
  })
})

describe('timestamp-convert / 时间戳 → 日期', () => {
  it('秒级时间戳换算到 UTC', () => {
    const out = transform({ text: '1790494200' }, {})
    expect(out).toContain('按秒识别')
    expect(out).toContain('Unix 毫秒：1790494200000')
    expect(out).toContain('UTC：2026-09-27 07:30:00')
  })

  it('毫秒级时间戳按阈值自动识别', () => {
    const out = transform({ text: '1790494200000' }, {})
    expect(out).toContain('按毫秒识别')
    expect(out).toContain('Unix 秒：1790494200')
  })

  it('负数时间戳正确落到 1969', () => {
    const out = transform({ text: '-31536000' }, {})
    expect(out).toContain('UTC：1969-01-01 00:00:00')
    expect(out).toContain('Unix 毫秒：-31536000000')
  })
})

describe('timestamp-convert / 日期 → 时间戳', () => {
  it('本地日期串换算回秒', () => {
    // 以 UTC 串输入，避免依赖浏览器本地时区
    const out = transform({ text: '2026-09-27T07:30:00Z' }, {})
    expect(out).toContain('识别方向：日期 → 时间戳')
    expect(out).toContain('Unix 秒：1790494200')
  })

  it('parseDate 支持斜杠与缺省时间', () => {
    expect(parseDate('2026/9/27').getFullYear()).toBe(2026)
  })

  it('无法解析的日期抛中文错误', () => {
    expect(() => transform({ text: '下周三' }, {})).toThrow(/无法解析的日期/)
  })

  it('2 月 30 日（本地串 / ISO 串）必须抛错，不得静默进位', () => {
    expect(() => parseDate('2026-02-30')).toThrow(/非法日期/)
    expect(() => parseDate('2026-02-30T00:00:00Z')).toThrow(/非法日期/)
  })
})

describe('timestamp-convert / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('输入超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
