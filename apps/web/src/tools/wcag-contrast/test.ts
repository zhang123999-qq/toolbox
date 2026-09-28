/**
 * wcag-contrast（#716）utils 单测：WCAG 官方示例向量、判定阈值、修复建议。
 */
import { describe, expect, it } from 'vitest'
import {
  checkContrast,
  contrastRatioOf,
  parseColor,
  relativeLuminance,
  suggestFix,
  wcagRating,
} from './utils'

describe('parseColor', () => {
  it('解析 hex / 颜色名并规范化', () => {
    expect(parseColor('#fff').hex).toBe('#ffffff')
    expect(parseColor('red').hex).toBe('#ff0000')
    expect(parseColor('  #123456  ').hex).toBe('#123456')
  })
  it('非法颜色与空输入抛中文错', () => {
    expect(() => parseColor('notacolor')).toThrow('无法解析的颜色')
    expect(() => parseColor('')).toThrow('无法解析的颜色')
    expect(() => parseColor('   ')).toThrow('无法解析的颜色')
  })
})

describe('relativeLuminance / contrastRatioOf', () => {
  it('黑白亮度为 0 与 1', () => {
    expect(relativeLuminance(parseColor('#000000'))).toBeCloseTo(0, 5)
    expect(relativeLuminance(parseColor('#ffffff'))).toBeCloseTo(1, 5)
  })
  it('黑白对比度为 21（WCAG 示例）', () => {
    expect(contrastRatioOf(parseColor('#000000'), parseColor('#ffffff'))).toBe(21)
  })
  it('相同颜色对比度为 1', () => {
    expect(contrastRatioOf(parseColor('#123456'), parseColor('#123456'))).toBe(1)
  })
  it('对比度与参数顺序无关', () => {
    const a = parseColor('#ff0000')
    const b = parseColor('#0000ff')
    expect(contrastRatioOf(a, b)).toBe(contrastRatioOf(b, a))
  })
  it('#767676 在白色上约 4.54（WCAG 典型通过值）', () => {
    expect(contrastRatioOf(parseColor('#767676'), parseColor('#ffffff'))).toBeCloseTo(4.54, 1)
  })
})

describe('wcagRating', () => {
  it('21 全通过', () => {
    expect(wcagRating(21)).toEqual({
      normalAA: true,
      normalAAA: true,
      largeAA: true,
      largeAAA: true,
      ui: true,
    })
  })
  it('2 全不通过', () => {
    const r = wcagRating(2)
    expect(Object.values(r).every((v) => v === false)).toBe(true)
  })
  it('阈值边界 4.5', () => {
    const r = wcagRating(4.5)
    expect(r.normalAA).toBe(true)
    expect(r.normalAAA).toBe(false)
    expect(r.largeAA).toBe(true)
    expect(r.largeAAA).toBe(true)
    expect(r.ui).toBe(true)
  })
  it('阈值边界 3 与 7', () => {
    expect(wcagRating(3).largeAA).toBe(true)
    expect(wcagRating(2.99).largeAA).toBe(false)
    expect(wcagRating(7).normalAAA).toBe(true)
    expect(wcagRating(6.99).normalAAA).toBe(false)
  })
})

describe('checkContrast', () => {
  it('黑白检测结果完整', () => {
    const res = checkContrast('#000', '#fff')
    expect(res.fg).toBe('#000000')
    expect(res.bg).toBe('#ffffff')
    expect(res.ratio).toBe(21)
    expect(res.rating.normalAAA).toBe(true)
  })
  it('非法输入透出中文错', () => {
    expect(() => checkContrast('zzz', '#fff')).toThrow('无法解析的颜色')
    expect(() => checkContrast('#fff', 'zzz')).toThrow('无法解析的颜色')
  })
})

describe('suggestFix', () => {
  it('已达标返回原色', () => {
    const s = suggestFix('#000000', '#ffffff')
    expect(s).not.toBeNull()
    expect(s!.hex).toBe('#000000')
    expect(s!.ratio).toBe(21)
  })
  it('浅灰在白色上给出加深建议且达标', () => {
    const s = suggestFix('#999999', '#ffffff', 4.5)
    expect(s).not.toBeNull()
    expect(s!.ratio).toBeGreaterThanOrEqual(4.5)
    // 建议色确实更深（相对亮度更低）
    expect(s!.hex).not.toBe('#999999')
  })
  it('深色在黑色上给出提亮建议', () => {
    const s = suggestFix('#333333', '#000000', 4.5)
    expect(s).not.toBeNull()
    expect(s!.ratio).toBeGreaterThanOrEqual(4.5)
  })
  it('两方向都无法达标时返回 null', () => {
    // #808080 上黑/白能达到的最大对比度约 5.32，目标 6 不可能达到
    expect(suggestFix('#ffffff', '#808080', 6)).toBeNull()
  })
  it('非法输入抛错', () => {
    expect(() => suggestFix('zzz', '#fff')).toThrow('无法解析')
  })
})
