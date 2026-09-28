import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ANGLE,
  DEFAULT_FONT_SIZE,
  DEFAULT_MARGIN,
  DEFAULT_OPACITY,
  DEFAULT_QUALITY,
  MAX_FILE_SIZE,
  MAX_MARGIN,
  assertFileSizeOk,
  buildOutputFileName,
  computePosition,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseAngle,
  parseFontSize,
  parseMargin,
  parseOpacity,
  parseQuality,
  parseWatermarkText,
  tileOrigins,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseFontSize', () => {
  it('空串用默认 48', () => {
    expect(parseFontSize('')).toBe(DEFAULT_FONT_SIZE)
    expect(parseFontSize('   ')).toBe(DEFAULT_FONT_SIZE)
  })

  it('正常解析', () => {
    expect(parseFontSize('8')).toBe(8)
    expect(parseFontSize('500')).toBe(500)
    expect(parseFontSize(' 48 ')).toBe(48)
  })

  it('非法抛错', () => {
    expect(() => parseFontSize('abc')).toThrow(/字号无效/)
    expect(() => parseFontSize('12.5')).toThrow(/字号无效/)
    expect(() => parseFontSize('7')).toThrow(/超出范围/)
    expect(() => parseFontSize('501')).toThrow(/超出范围/)
  })
})

describe('parseOpacity', () => {
  it('空串用默认 50', () => {
    expect(parseOpacity('')).toBe(DEFAULT_OPACITY)
    expect(parseOpacity('   ')).toBe(DEFAULT_OPACITY)
  })

  it('正常解析', () => {
    expect(parseOpacity('0')).toBe(0)
    expect(parseOpacity('100')).toBe(100)
    expect(parseOpacity(' 50 ')).toBe(50)
  })

  it('非法抛错', () => {
    expect(() => parseOpacity('abc')).toThrow(/不透明度无效/)
    expect(() => parseOpacity('-1')).toThrow(/不透明度无效/)
    expect(() => parseOpacity('101')).toThrow(/超出范围/)
  })
})

describe('parseAngle', () => {
  it('空串用默认 -30', () => {
    expect(parseAngle('')).toBe(DEFAULT_ANGLE)
    expect(parseAngle('   ')).toBe(DEFAULT_ANGLE)
  })

  it('正常解析（含小数与边界）', () => {
    expect(parseAngle('-180')).toBe(-180)
    expect(parseAngle('180')).toBe(180)
    expect(parseAngle('-30')).toBe(-30)
    expect(parseAngle('45.5')).toBe(45.5)
  })

  it('非法抛错', () => {
    expect(() => parseAngle('abc')).toThrow(/角度无效/)
    expect(() => parseAngle('200')).toThrow(/超出范围/)
    expect(() => parseAngle('-200')).toThrow(/超出范围/)
  })
})

describe('parseMargin', () => {
  it('空串用默认 24', () => {
    expect(parseMargin('')).toBe(DEFAULT_MARGIN)
    expect(parseMargin('   ')).toBe(DEFAULT_MARGIN)
  })

  it('正常解析', () => {
    expect(parseMargin('0')).toBe(0)
    expect(parseMargin('500')).toBe(500)
    expect(parseMargin(' 24 ')).toBe(24)
  })

  it('非法抛错', () => {
    expect(() => parseMargin('abc')).toThrow(/边距无效/)
    expect(() => parseMargin('-1')).toThrow(/边距无效/)
    expect(() => parseMargin(String(MAX_MARGIN + 1))).toThrow(/边距过大/)
  })
})

describe('parseWatermarkText', () => {
  it('去首尾空白', () => {
    expect(parseWatermarkText('  hello  ')).toBe('hello')
  })

  it('空或全空白抛错', () => {
    expect(() => parseWatermarkText('')).toThrow('水印文字不能为空')
    expect(() => parseWatermarkText('   ')).toThrow('水印文字不能为空')
  })
})

describe('parseQuality', () => {
  it('空串用默认 80', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
    expect(parseQuality('   ')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
    expect(parseQuality(' 85 ')).toBe(85)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
  })
})

describe('computePosition 九宫格', () => {
  // img 800x600，文本 100x48，边距 24
  const args = [800, 600, 100, 48] as const

  it('左上', () => {
    expect(computePosition(...args, 'top-left', 24)).toEqual({ x: 24, y: 24 })
  })
  it('上中', () => {
    expect(computePosition(...args, 'top-center', 24)).toEqual({ x: 350, y: 24 })
  })
  it('右上', () => {
    expect(computePosition(...args, 'top-right', 24)).toEqual({ x: 676, y: 24 })
  })
  it('左中', () => {
    expect(computePosition(...args, 'middle-left', 24)).toEqual({ x: 24, y: 276 })
  })
  it('居中', () => {
    expect(computePosition(...args, 'center', 24)).toEqual({ x: 350, y: 276 })
  })
  it('右中', () => {
    expect(computePosition(...args, 'middle-right', 24)).toEqual({ x: 676, y: 276 })
  })
  it('左下', () => {
    expect(computePosition(...args, 'bottom-left', 24)).toEqual({ x: 24, y: 528 })
  })
  it('下中', () => {
    expect(computePosition(...args, 'bottom-center', 24)).toEqual({ x: 350, y: 528 })
  })
  it('右下', () => {
    expect(computePosition(...args, 'bottom-right', 24)).toEqual({ x: 676, y: 528 })
  })
})

describe('tileOrigins 平铺原点', () => {
  it('按步长铺满', () => {
    expect(tileOrigins(100, 50, 30, 30)).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 60, y: 0 },
      { x: 90, y: 0 },
      { x: 0, y: 30 },
      { x: 30, y: 30 },
      { x: 60, y: 30 },
      { x: 90, y: 30 },
    ])
  })

  it('尺寸非法返回空数组', () => {
    expect(tileOrigins(NaN, 100, 10, 10)).toEqual([])
    expect(tileOrigins(100, NaN, 10, 10)).toEqual([])
    expect(tileOrigins(0, 100, 10, 10)).toEqual([])
    expect(tileOrigins(100, -5, 10, 10)).toEqual([])
  })

  it('步长非法返回空数组', () => {
    expect(tileOrigins(100, 100, NaN, 10)).toEqual([])
    expect(tileOrigins(100, 100, 10, NaN)).toEqual([])
    expect(tileOrigins(100, 100, 0, 10)).toEqual([])
    expect(tileOrigins(100, 100, 10, -1)).toEqual([])
  })
})

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })

  it('PNG 质量不生效', () => {
    expect(effectiveQuality('png', 80)).toBeUndefined()
    expect(effectiveQuality('jpeg', 80)).toBe(0.8)
    expect(effectiveQuality('webp', 100)).toBe(1)
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-watermarked.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-watermarked.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-watermarked.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-watermarked.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-watermarked.png')
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})
