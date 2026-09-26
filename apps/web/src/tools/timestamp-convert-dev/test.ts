import { describe, expect, it } from 'vitest'
import { parseDate, transform } from './utils'

describe('timestamp-convert-dev / parseDate', () => {
  it('解析 `YYYY-MM-DD HH:mm:ss` 为本地时间', () => {
    const d = parseDate('2026-09-26 12:00:00')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(26)
    expect(d.getHours()).toBe(12)
  })

  it('解析 ISO 带 Z', () => {
    const d = parseDate('2020-09-14T12:26:40.000Z')
    expect(d.getTime()).toBe(1600086400000)
  })

  it('无法解析的格式抛错', () => {
    expect(() => parseDate('not a date')).toThrow(/无法解析/)
  })
})

describe('timestamp-convert-dev / transform', () => {
  it('秒级时间戳 → 同时给出秒与毫秒', () => {
    const out = transform({ text: '1600000000' }, { unit: 'auto' })
    expect(out).toContain('Unix 时间戳（秒）：1600000000')
    expect(out).toContain('Unix 时间戳（毫秒）：1600000000000')
  })

  it('毫秒级时间戳自动识别（不放大 1000 倍）', () => {
    const out = transform({ text: '1600000000000' }, { unit: 'auto' })
    expect(out).toContain('Unix 时间戳（毫秒）：1600000000000')
    expect(out).toContain('Unix 时间戳（秒）：1600000000')
  })

  it('强制按秒解释 13 位数字', () => {
    const out = transform({ text: '1600000000000' }, { unit: 's' })
    // 当作秒 → *1000
    expect(out).toContain('Unix 时间戳（毫秒）：1600000000000000')
  })

  it('日期串 → 给出秒/毫秒/ISO', () => {
    const out = transform({ text: '2026-09-26 12:00:00' }, { unit: 'auto' })
    const expectedSec = Math.floor(new Date(2026, 8, 26, 12, 0, 0).getTime() / 1000)
    expect(out).toContain(`Unix 时间戳（秒）：${expectedSec}`)
    expect(out).toContain('ISO 8601：')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { unit: 'auto' })).toBe('')
    expect(transform({ text: '   ' }, { unit: 'auto' })).toBe('')
  })

  it('非法日期进入错误态（抛错）', () => {
    expect(() => transform({ text: 'hello world' }, { unit: 'auto' })).toThrow(/无法解析/)
  })

  it('超上限报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, { unit: 'auto' })).toThrow(/上限/)
  })
})
