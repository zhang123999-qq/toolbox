import { describe, expect, it } from 'vitest'
import { parseAny, transform } from './utils'

describe('iso8601 / parseAny', () => {
  it('解析带 Z 的 ISO 串', () => {
    const d = parseAny('2026-09-26T06:00:00.000Z')
    expect(d.getTime()).toBe(Date.UTC(2026, 8, 26, 6, 0, 0))
  })

  it('解析带 +08:00 偏移的串', () => {
    const d = parseAny('2026-09-26T14:00:00+08:00')
    expect(d.getTime()).toBe(Date.UTC(2026, 8, 26, 6, 0, 0))
  })

  it('空格分隔 + Z 按 UTC 解释（不被本地时区污染）', () => {
    const d = parseAny('2026-09-26 14:00:00Z')
    expect(d.getTime()).toBe(Date.UTC(2026, 8, 26, 14, 0, 0))
  })

  it('无冒号偏移 +0800 归一为 +08:00', () => {
    const d = parseAny('2026-09-26T14:00:00+0800')
    expect(d.getTime()).toBe(Date.UTC(2026, 8, 26, 6, 0, 0))
  })

  it('解析时间戳（秒）', () => {
    const d = parseAny('1600000000')
    expect(d.getTime()).toBe(1600000000000)
  })

  it('解析日期串', () => {
    const d = parseAny('2026-09-26 14:00:00')
    expect(d.getTime()).toBe(new Date(2026, 8, 26, 14, 0, 0).getTime())
  })

  it('非法输入抛错', () => {
    expect(() => parseAny('garbage')).toThrow(/无法解析/)
  })
})

describe('iso8601 / transform', () => {
  it('输出 UTC(Z) 与本地偏移两种 ISO', () => {
    const out = transform({ text: '2026-09-26T06:00:00.000Z' }, {})
    expect(out).toContain('ISO 8601（UTC，带 Z）：2026-09-26T06:00:00.000Z')
    expect(out).toContain('ISO 8601（本地偏移）：')
  })

  it('输出逐字段与 Unix 时间戳', () => {
    const out = transform({ text: '2026-09-26T06:00:00.000Z' }, {})
    expect(out).toContain('周：周六')
    expect(out).toContain('Unix 秒：1790402400')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
