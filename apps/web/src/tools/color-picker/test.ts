import { describe, expect, it } from 'vitest'
import {
  errorMessage,
  formatHslText,
  formatRgbText,
  hexToRgb,
  isAbortError,
  isEyeDropperSupported,
  parseHexInput,
  rgbToHex,
  rgbToHsl,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('hexToRgb', () => {
  it('#rrggbb 解析', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#1a2B3c')).toEqual({ r: 26, g: 43, b: 60 })
  })

  it('#rgb 简写展开', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#0f8')).toEqual({ r: 0, g: 255, b: 136 })
  })

  it('# 可省略、前后空白容忍', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('  #00ff00  ')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('非法抛错', () => {
    expect(() => hexToRgb('')).toThrow(/颜色值无效/)
    expect(() => hexToRgb('#ff00')).toThrow(/颜色值无效/)
    expect(() => hexToRgb('#ff000')).toThrow(/颜色值无效/)
    expect(() => hexToRgb('#gg0000')).toThrow(/颜色值无效/)
    expect(() => hexToRgb('red')).toThrow(/颜色值无效/)
    expect(() => hexToRgb('#ff00000')).toThrow(/颜色值无效/)
  })
})

describe('rgbToHex', () => {
  it('正常转换', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    expect(rgbToHex(26, 43, 60)).toBe('#1a2b3c')
  })

  it('越界钳制到 0–255 并取整', () => {
    expect(rgbToHex(-10, 300, 128.6)).toBe('#00ff81')
    expect(rgbToHex(254.4, 0.5, -0.4)).toBe('#fe0100')
  })
})

describe('rgbToHsl', () => {
  it('纯红 #ff0000 → h0 s100 l50', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 })
  })

  it('纯绿 / 纯蓝走不同色相分支', () => {
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 })
  })

  it('灰色无饱和度', () => {
    expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: 50 })
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 })
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 })
  })

  it('l > 0.5 的饱和度公式分支', () => {
    // #ff8080：l=75，s 应为 100
    expect(rgbToHsl(255, 128, 128)).toEqual({ h: 0, s: 100, l: 75 })
  })

  it('红色系 gn < bn 的色相修正分支', () => {
    // #ff0080 → h330
    expect(rgbToHsl(255, 0, 128)).toEqual({ h: 330, s: 100, l: 50 })
  })

  it('品红 #ff00ff → h300', () => {
    expect(rgbToHsl(255, 0, 255)).toEqual({ h: 300, s: 100, l: 50 })
  })
})

describe('isEyeDropperSupported', () => {
  it('node 环境（无 window）返回 false', () => {
    expect(isEyeDropperSupported()).toBe(false)
  })
})

describe('parseHexInput', () => {
  it('空输入抛错', () => {
    expect(() => parseHexInput('')).toThrow(/请输入颜色值/)
    expect(() => parseHexInput('   ')).toThrow(/请输入颜色值/)
  })

  it('校验并归一化为小写 #rrggbb', () => {
    expect(parseHexInput('#F00')).toBe('#ff0000')
    expect(parseHexInput('  #1A2b3C ')).toBe('#1a2b3c')
    expect(parseHexInput('00ff00')).toBe('#00ff00')
  })

  it('非法输入抛错', () => {
    expect(() => parseHexInput('xyz')).toThrow(/颜色值无效/)
    expect(() => parseHexInput('#12345')).toThrow(/颜色值无效/)
  })
})

describe('isAbortError', () => {
  it('DOMException AbortError → true', () => {
    expect(isAbortError(new DOMException('cancelled', 'AbortError'))).toBe(true)
  })

  it('DOMException 其他 name → false', () => {
    expect(isAbortError(new DOMException('denied', 'NotAllowedError'))).toBe(false)
  })

  it('普通对象按 name 判断', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
    expect(isAbortError({ name: 'OtherError' })).toBe(false)
    expect(isAbortError({})).toBe(false)
  })

  it('非对象 / null → false', () => {
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError(undefined)).toBe(false)
    expect(isAbortError('AbortError')).toBe(false)
    expect(isAbortError(new Error('x'))).toBe(false)
  })
})

describe('formatRgbText / formatHslText', () => {
  it('rgb 文本', () => {
    expect(formatRgbText(255, 0, 0)).toBe('rgb(255, 0, 0)')
    expect(formatRgbText(10, 20, 30)).toBe('rgb(10, 20, 30)')
  })

  it('hsl 文本', () => {
    expect(formatHslText(0, 100, 50)).toBe('hsl(0, 100%, 50%)')
    expect(formatHslText(210, 50, 8)).toBe('hsl(210, 50%, 8%)')
  })
})
