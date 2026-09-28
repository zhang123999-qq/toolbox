/**
 * font-size（#738）utils 单测：纯函数，无 DOM 依赖。
 */
import { describe, expect, it } from 'vitest'
import { assessReadability, generateFluidType, pxToRem, remToPx } from './utils'

describe('generateFluidType', () => {
  it('标准参数生成 clamp 公式', () => {
    const css = generateFluidType({ minPx: 16, maxPx: 24, minVw: 320, maxVw: 1200 })
    // slope = 8/880 = 0.009090..., intercept = 16 - 0.009090*320 = 13.0909
    expect(css).toContain('font-size: clamp(16px, 13.0909px + 0.9091vw, 24px);')
  })
  it('min=max 时为固定字号', () => {
    const css = generateFluidType({ minPx: 18, maxPx: 18, minVw: 320, maxVw: 1200 })
    expect(css).toContain('clamp(18px, 18px + 0vw, 18px);')
  })
  it('非法参数抛中文错', () => {
    const bad = (p: object) =>
      expect(() =>
        generateFluidType({ minPx: 16, maxPx: 24, minVw: 320, maxVw: 1200, ...p }),
      ).toThrow()
    bad({ minPx: 0 })
    bad({ maxPx: 12 })
    bad({ minVw: 1200, maxVw: 320 })
    bad({ minVw: 0 })
    bad({ minPx: NaN })
    expect(() => generateFluidType({ minPx: 16, maxPx: 24, minVw: 320, maxVw: 1200 })).not.toThrow()
  })
  it('错误信息明确', () => {
    expect(() => generateFluidType({ minPx: 24, maxPx: 16, minVw: 320, maxVw: 1200 })).toThrow(
      '最大字号不能小于最小字号',
    )
    expect(() => generateFluidType({ minPx: 16, maxPx: 24, minVw: 500, maxVw: 500 })).toThrow(
      '最大视口必须大于最小视口',
    )
  })
})

describe('assessReadability', () => {
  it('理想参数满分', () => {
    const r = assessReadability({ fontSizePx: 16, lineLengthChars: 60, lineHeight: 1.6 })
    expect(r.score).toBe(100)
    expect(r.issues).toEqual([])
    expect(r.suggestions).toEqual([])
  })
  it('边界值满分', () => {
    expect(assessReadability({ fontSizePx: 16, lineLengthChars: 45, lineHeight: 1.4 }).score).toBe(
      100,
    )
    expect(assessReadability({ fontSizePx: 20, lineLengthChars: 75, lineHeight: 1.8 }).score).toBe(
      100,
    )
  })
  it('小字号扣分并给建议', () => {
    const r = assessReadability({ fontSizePx: 12, lineLengthChars: 60, lineHeight: 1.6 })
    expect(r.score).toBe(80)
    expect(r.issues.some((i) => i.includes('偏小'))).toBe(true)
    expect(r.suggestions.some((s) => s.includes('16px'))).toBe(true)
  })
  it('14–16px 得 20 分档', () => {
    const r = assessReadability({ fontSizePx: 15, lineLengthChars: 60, lineHeight: 1.6 })
    expect(r.score).toBe(90)
  })
  it('极小字号得 0 分档', () => {
    const r = assessReadability({ fontSizePx: 10, lineLengthChars: 60, lineHeight: 1.6 })
    expect(r.score).toBe(70)
  })
  it('过宽行宽扣分', () => {
    const r = assessReadability({ fontSizePx: 16, lineLengthChars: 100, lineHeight: 1.6 })
    expect(r.score).toBe(70)
    expect(r.suggestions.some((s) => s.includes('45–75'))).toBe(true)
  })
  it('临界行宽得半分', () => {
    const r = assessReadability({ fontSizePx: 16, lineLengthChars: 40, lineHeight: 1.6 })
    expect(r.score).toBe(85)
  })
  it('行高过小扣分', () => {
    const r = assessReadability({ fontSizePx: 16, lineLengthChars: 60, lineHeight: 1.1 })
    expect(r.score).toBe(60)
    expect(r.suggestions.some((s) => s.includes('1.4–1.8'))).toBe(true)
  })
  it('临界行高得半分', () => {
    const r = assessReadability({ fontSizePx: 16, lineLengthChars: 60, lineHeight: 2.0 })
    expect(r.score).toBe(80)
  })
  it('非法输入抛错', () => {
    expect(() =>
      assessReadability({ fontSizePx: 0, lineLengthChars: 60, lineHeight: 1.6 }),
    ).toThrow('字号必须大于 0')
    expect(() =>
      assessReadability({ fontSizePx: 16, lineLengthChars: -1, lineHeight: 1.6 }),
    ).toThrow('行宽必须大于 0')
    expect(() =>
      assessReadability({ fontSizePx: 16, lineLengthChars: 60, lineHeight: NaN }),
    ).toThrow('行高必须是数字')
    expect(() => assessReadability({ fontSizePx: 16, lineLengthChars: 60, lineHeight: 0 })).toThrow(
      '行高必须大于 0',
    )
  })
})

describe('pxToRem / remToPx', () => {
  it('16px = 1rem（默认根字号）', () => {
    expect(pxToRem(16)).toMatchObject({ rem: 1, css: '1rem' })
    expect(remToPx(1)).toMatchObject({ px: 16, css: '16px' })
  })
  it('自定义根字号', () => {
    expect(pxToRem(20, 10).css).toBe('2rem')
    expect(remToPx(2, 10).css).toBe('20px')
  })
  it('小数保留 4 位', () => {
    expect(pxToRem(15).css).toBe('0.9375rem')
  })
  it('非法输入抛错', () => {
    expect(() => pxToRem(-1)).toThrow('不能为负数')
    expect(() => pxToRem(16, 0)).toThrow('根字号必须大于 0')
    expect(() => remToPx(-2)).toThrow('不能为负数')
    expect(() => remToPx(1, 0)).toThrow('根字号必须大于 0')
    expect(() => pxToRem(NaN)).toThrow('必须是数字')
  })
})
