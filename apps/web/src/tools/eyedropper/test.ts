import { describe, expect, it } from 'vitest'
import {
  buildColorReport,
  hslToCss,
  makeRgb,
  parseColorInput,
  rgbToCss,
  rgbToHex,
  rgbToHsl,
  sampleAverageColor,
} from './utils'

describe('eyedropper / 颜色解析', () => {
  it('#rrggbb / #rgb / 省略 # / 大小写', () => {
    expect(parseColorInput('#ff6b00')).toEqual({ r: 255, g: 107, b: 0 })
    expect(parseColorInput('ff6b00')).toEqual({ r: 255, g: 107, b: 0 })
    expect(parseColorInput('#F60')).toEqual({ r: 255, g: 102, b: 0 })
    expect(parseColorInput('#FF6B00')).toEqual({ r: 255, g: 107, b: 0 })
    expect(parseColorInput('  #ff6b00  ')).toEqual({ r: 255, g: 107, b: 0 })
  })

  it('rgb() 写法', () => {
    expect(parseColorInput('rgb(255, 107, 0)')).toEqual({ r: 255, g: 107, b: 0 })
    expect(parseColorInput('RGB(0,0,0)')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('非法输入抛中文错', () => {
    expect(() => parseColorInput('')).toThrow(/颜色不能为空/)
    expect(() => parseColorInput('   ')).toThrow(/颜色不能为空/)
    expect(() => parseColorInput('#ff')).toThrow(/颜色格式非法/)
    expect(() => parseColorInput('#ff6b0011')).toThrow(/颜色格式非法/)
    expect(() => parseColorInput('#gg0000')).toThrow(/颜色格式非法/)
    expect(() => parseColorInput('red')).toThrow(/颜色格式非法/)
    expect(() => parseColorInput('rgb(256, 0, 0)')).toThrow(/颜色分量非法/)
    expect(() => parseColorInput('rgb(1, 2)')).toThrow(/颜色格式非法/)
  })

  it('makeRgb 通道校验', () => {
    expect(() => makeRgb(256, 0, 0)).toThrow(/颜色分量非法/)
    expect(() => makeRgb(0, -1, 0)).toThrow(/颜色分量非法/)
    expect(() => makeRgb(0, 0, 1.5)).toThrow(/颜色分量非法/)
    expect(makeRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('eyedropper / 格式转换', () => {
  it('rgbToHex / rgbToCss', () => {
    expect(rgbToHex({ r: 255, g: 107, b: 0 })).toBe('#ff6b00')
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
    expect(rgbToCss({ r: 255, g: 107, b: 0 })).toBe('rgb(255, 107, 0)')
    expect(() => rgbToHex({ r: 256, g: 0, b: 0 })).toThrow(/颜色分量非法/)
    expect(() => rgbToCss({ r: 0, g: 0, b: -1 })).toThrow(/颜色分量非法/)
  })

  it('rgbToHsl 各分支：灰 / 红 / 绿 / 蓝 / 品红 / 浅色', () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 })
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50 })
    expect(rgbToHsl({ r: 255, g: 0, b: 255 })).toEqual({ h: 300, s: 100, l: 50 })
    expect(rgbToHsl({ r: 255, g: 200, b: 200 })).toEqual({ h: 0, s: 100, l: 89 })
    expect(() => rgbToHsl({ r: 300, g: 0, b: 0 })).toThrow(/颜色分量非法/)
  })

  it('hslToCss 与非法值', () => {
    expect(hslToCss({ h: 20, s: 100, l: 50 })).toBe('hsl(20, 100%, 50%)')
    expect(() => hslToCss({ h: -1, s: 50, l: 50 })).toThrow(/色相非法/)
    expect(() => hslToCss({ h: 361, s: 50, l: 50 })).toThrow(/色相非法/)
    expect(() => hslToCss({ h: Number.NaN, s: 50, l: 50 })).toThrow(/色相非法/)
    expect(() => hslToCss({ h: 20, s: 101, l: 50 })).toThrow(/饱和度非法/)
    expect(() => hslToCss({ h: 20, s: -1, l: 50 })).toThrow(/饱和度非法/)
    expect(() => hslToCss({ h: 20, s: 50, l: 101 })).toThrow(/亮度非法/)
    expect(() => hslToCss({ h: 20, s: 50, l: -1 })).toThrow(/亮度非法/)
  })
})

describe('eyedropper / 像素采样平均', () => {
  /** 2×2 测试图：红 绿 / 蓝 白 */
  function testPixels(): Uint8ClampedArray {
    return new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ])
  }

  it('单点采样', () => {
    expect(sampleAverageColor(testPixels(), 2, 2, 0, 0, 0)).toEqual({ r: 255, g: 0, b: 0 })
    expect(sampleAverageColor(testPixels(), 2, 2, 1, 1, 0)).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('半径覆盖全图求平均（越界自动忽略）', () => {
    expect(sampleAverageColor(testPixels(), 2, 2, 0, 0, 5)).toEqual({ r: 128, g: 128, b: 128 })
  })

  it('非法参数抛中文错', () => {
    expect(() => sampleAverageColor(testPixels(), 0, 2, 0, 0, 0)).toThrow(/图像尺寸非法/)
    expect(() => sampleAverageColor(testPixels(), 2, -1, 0, 0, 0)).toThrow(/图像尺寸非法/)
    expect(() => sampleAverageColor(testPixels(), 2.5, 2, 0, 0, 0)).toThrow(/图像尺寸非法/)
    expect(() => sampleAverageColor(new Uint8ClampedArray(10), 2, 2, 0, 0, 0)).toThrow(
      /长度与图像尺寸不匹配/,
    )
    expect(() => sampleAverageColor(testPixels(), 2, 2, 0.5, 0, 0)).toThrow(/采样坐标必须是整数/)
    expect(() => sampleAverageColor(testPixels(), 2, 2, 0, 0, -1)).toThrow(/采样半径必须是/)
    expect(() => sampleAverageColor(testPixels(), 2, 2, 0, 0, 1.5)).toThrow(/采样半径必须是/)
    expect(() => sampleAverageColor(testPixels(), 2, 2, 99, 99, 0)).toThrow(/超出图像范围/)
  })
})

describe('eyedropper / 颜色报告', () => {
  it('三行 HEX / RGB / HSL', () => {
    const report = buildColorReport({ r: 255, g: 107, b: 0 })
    expect(report).toContain('HEX：#ff6b00')
    expect(report).toContain('RGB：rgb(255, 107, 0)')
    expect(report).toContain('HSL：hsl(')
  })
})
