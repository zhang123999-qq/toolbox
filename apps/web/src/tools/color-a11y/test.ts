/**
 * color-a11y（#729）utils 单测：色盲模拟与安全检查。
 */
import { describe, expect, it } from 'vitest'
import {
  COLOR_BLIND_TYPES,
  colorBlindReport,
  contrastRatioOf,
  formatColorA11yReport,
  isColorBlindSafe,
  parseRgb,
  simulateColorBlindness,
} from './utils'

describe('parseRgb', () => {
  it('解析 hex 与颜色名', () => {
    expect(parseRgb('#fff')).toEqual([1, 1, 1])
    expect(parseRgb('red')).toEqual([1, 0, 0])
    expect(parseRgb('#000000')).toEqual([0, 0, 0])
  })
  it('空与非法抛中文错', () => {
    expect(() => parseRgb('  ')).toThrow('请输入颜色')
    expect(() => parseRgb('notacolor')).toThrow('无法解析')
  })
})

describe('simulateColorBlindness', () => {
  it('normal 原样规范化', () => {
    expect(simulateColorBlindness('#ff0000', 'normal')).toBe('#ff0000')
    expect(simulateColorBlindness('red', 'normal')).toBe('#ff0000')
  })
  it('全色盲下纯红变灰 #959595', () => {
    expect(simulateColorBlindness('#ff0000', 'achromatopsia')).toBe('#959595')
  })
  it('黑白在各模型下保持', () => {
    for (const t of COLOR_BLIND_TYPES) {
      expect(simulateColorBlindness('#ffffff', t)).toBe('#ffffff')
      expect(simulateColorBlindness('#000000', t)).toBe('#000000')
    }
  })
  it('输出恒为合法 hex', () => {
    for (const t of COLOR_BLIND_TYPES) {
      expect(simulateColorBlindness('#3a7bd5', t)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('contrastRatioOf', () => {
  it('黑白对比度 21', () => {
    expect(contrastRatioOf('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatioOf('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })
  it('同色对比度 1', () => {
    expect(contrastRatioOf('#123456', '#123456')).toBeCloseTo(1, 5)
  })
})

describe('colorBlindReport', () => {
  it('黑白：全部通过', () => {
    const r = colorBlindReport('#000000', '#ffffff')
    expect(r.fg).toBe('#000000')
    expect(r.bg).toBe('#ffffff')
    expect(r.normalRatio).toBeCloseTo(21, 1)
    expect(r.normalPassAA).toBe(true)
    expect(r.simulations).toHaveLength(4)
    expect(r.simulations.map((s) => s.label)).toEqual(['红色盲', '绿色盲', '蓝色盲', '全色盲'])
    expect(r.colorBlindSafe).toBe(true)
    expect(isColorBlindSafe('#000000', '#ffffff')).toBe(true)
  })
  it('红绿：色盲不安全', () => {
    const r = colorBlindReport('#ff0000', '#00ff00')
    expect(r.normalPassAA).toBe(false)
    expect(r.colorBlindSafe).toBe(false)
    expect(isColorBlindSafe('#ff0000', '#00ff00')).toBe(false)
  })
  it('非法颜色抛错', () => {
    expect(() => colorBlindReport('zzz', '#fff')).toThrow('无法解析')
  })
})

describe('formatColorA11yReport', () => {
  it('安全结论', () => {
    const text = formatColorA11yReport(colorBlindReport('#000000', '#ffffff'))
    expect(text).toContain('对比度：21.00')
    expect(text).toContain('色盲安全')
    expect(text).toContain('红色盲')
  })
  it('风险结论', () => {
    const text = formatColorA11yReport(colorBlindReport('#ff0000', '#00ff00'))
    expect(text).toContain('难以辨识的风险')
  })
})
