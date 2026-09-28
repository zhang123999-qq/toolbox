import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUALITY,
  MAX_FILE_SIZE,
  MAX_PERCENT,
  MAX_PIXEL_LIMIT,
  MIN_PERCENT,
  assertFileSizeOk,
  buildOutputFileName,
  computePercentSize,
  computePixelSize,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parsePercent,
  parsePositiveInt,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
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
    expect(() => parseQuality('85.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
  })
})

describe('parsePositiveInt', () => {
  it('正常解析', () => {
    expect(parsePositiveInt('1')).toBe(1)
    expect(parsePositiveInt('1920')).toBe(1920)
    expect(parsePositiveInt('  300  ')).toBe(300)
    expect(parsePositiveInt(String(MAX_PIXEL_LIMIT))).toBe(MAX_PIXEL_LIMIT)
  })

  it('非法抛错', () => {
    expect(() => parsePositiveInt('')).toThrow(/宽高无效/)
    expect(() => parsePositiveInt('   ')).toThrow(/宽高无效/)
    expect(() => parsePositiveInt('abc')).toThrow(/宽高无效/)
    expect(() => parsePositiveInt('-5')).toThrow(/宽高无效/)
    expect(() => parsePositiveInt('12.5')).toThrow(/宽高无效/)
  })

  it('超限抛错', () => {
    expect(() => parsePositiveInt('0')).toThrow(/超出范围/)
    expect(() => parsePositiveInt(String(MAX_PIXEL_LIMIT + 1))).toThrow(/超出范围/)
  })
})

describe('parsePercent', () => {
  it('正常解析（含小数与边界）', () => {
    expect(parsePercent('1')).toBe(1)
    expect(parsePercent('1000')).toBe(1000)
    expect(parsePercent('12.5')).toBe(12.5)
    expect(parsePercent(' 50 ')).toBe(50)
  })

  it('非法抛错', () => {
    expect(() => parsePercent('')).toThrow(/百分比无效/)
    expect(() => parsePercent('abc')).toThrow(/百分比无效/)
    expect(() => parsePercent('-5')).toThrow(/百分比无效/)
    expect(() => parsePercent('.5')).toThrow(/百分比无效/)
    expect(() => parsePercent('12.')).toThrow(/百分比无效/)
  })

  it('超范围抛错', () => {
    expect(() => parsePercent('0')).toThrow(/超出范围/)
    expect(() => parsePercent('0.5')).toThrow(/超出范围/)
    expect(() => parsePercent('1000.1')).toThrow(/超出范围/)
    expect(() => parsePercent(String(MAX_PERCENT + 1))).toThrow(/超出范围/)
    expect(parsePercent(String(MIN_PERCENT))).toBe(MIN_PERCENT)
  })
})

describe('computePixelSize', () => {
  it('锁定：只给宽→高按原图比例', () => {
    expect(computePixelSize(800, 600, 400, undefined, true)).toEqual({ width: 400, height: 300 })
  })

  it('锁定：只给高→宽按原图比例', () => {
    expect(computePixelSize(800, 600, undefined, 300, true)).toEqual({ width: 400, height: 300 })
  })

  it('锁定：宽高都给→直取', () => {
    expect(computePixelSize(800, 600, 400, 200, true)).toEqual({ width: 400, height: 200 })
  })

  it('锁定：都没给→原图尺寸', () => {
    expect(computePixelSize(800, 600, undefined, undefined, true)).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('锁定：计算结果至少 1px', () => {
    expect(computePixelSize(10000, 1, 1, undefined, true)).toEqual({ width: 1, height: 1 })
    expect(computePixelSize(1, 10000, undefined, 1, true)).toEqual({ width: 1, height: 1 })
  })

  it('未锁定：给什么用什么，没给的边用原图', () => {
    expect(computePixelSize(800, 600, 400, undefined, false)).toEqual({ width: 400, height: 600 })
    expect(computePixelSize(800, 600, undefined, 300, false)).toEqual({ width: 800, height: 300 })
    expect(computePixelSize(800, 600, 400, 300, false)).toEqual({ width: 400, height: 300 })
    expect(computePixelSize(800, 600, undefined, undefined, false)).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('非法原图尺寸抛错', () => {
    expect(() => computePixelSize(0, 100, 400, undefined, true)).toThrow(/图片尺寸无效/)
    expect(() => computePixelSize(NaN, 100, 400, undefined, true)).toThrow(/图片尺寸无效/)
    expect(() => computePixelSize(100, NaN, 400, undefined, true)).toThrow(/图片尺寸无效/)
    expect(() => computePixelSize(100, 0, 400, undefined, true)).toThrow(/图片尺寸无效/)
    expect(() => computePixelSize(Infinity, 100, 400, undefined, true)).toThrow(/图片尺寸无效/)
  })
})

describe('computePercentSize', () => {
  it('按百分比缩放', () => {
    expect(computePercentSize(800, 600, 50)).toEqual({ width: 400, height: 300 })
    expect(computePercentSize(800, 600, 100)).toEqual({ width: 800, height: 600 })
    expect(computePercentSize(800, 600, 12.5)).toEqual({ width: 100, height: 75 })
  })

  it('结果至少 1px', () => {
    // 10000x1 按 1% 缩放：宽 100、高 0.01→保底 1
    expect(computePercentSize(10000, 1, 1)).toEqual({ width: 100, height: 1 })
  })

  it('非法原图尺寸抛错', () => {
    expect(() => computePercentSize(0, 100, 50)).toThrow(/图片尺寸无效/)
    expect(() => computePercentSize(NaN, 100, 50)).toThrow(/图片尺寸无效/)
    expect(() => computePercentSize(100, NaN, 50)).toThrow(/图片尺寸无效/)
    expect(() => computePercentSize(100, -1, 50)).toThrow(/图片尺寸无效/)
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
  it('原名 + 目标尺寸 + 替换扩展名', () => {
    expect(buildOutputFileName('photo.png', 'jpeg', 400, 300)).toBe('photo-400x300.jpg')
    expect(buildOutputFileName('a.webp', 'png', 100, 100)).toBe('a-100x100.png')
    expect(buildOutputFileName('noext', 'webp', 8, 8)).toBe('noext-8x8.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg', 400, 300)).toBe('image-400x300.jpg')
    expect(buildOutputFileName('.png', 'png', 1, 1)).toBe('image-1x1.png')
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
