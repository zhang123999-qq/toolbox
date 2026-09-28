import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BG_COLOR,
  DEFAULT_QUALITY,
  DIMENSION_LIMIT,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  computeContainLayout,
  computeCoverLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseBgColor,
  parseDimension,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseDimension', () => {
  it('正常解析（含边界 1 与 16384）', () => {
    expect(parseDimension('1', '宽度')).toBe(1)
    expect(parseDimension('1920', '宽度')).toBe(1920)
    expect(parseDimension(String(DIMENSION_LIMIT), '高度')).toBe(DIMENSION_LIMIT)
    expect(parseDimension(' 720 ', '高度')).toBe(720)
  })

  it('非法抛错', () => {
    expect(() => parseDimension('', '宽度')).toThrow(/宽度无效/)
    expect(() => parseDimension('abc', '宽度')).toThrow(/宽度无效/)
    expect(() => parseDimension('12.5', '宽度')).toThrow(/宽度无效/)
    expect(() => parseDimension('-1', '宽度')).toThrow(/宽度无效/)
    expect(() => parseDimension('0', '高度')).toThrow(/高度超出范围/)
    expect(() => parseDimension(String(DIMENSION_LIMIT + 1), '高度')).toThrow(/高度超出范围/)
  })
})

describe('parseBgColor', () => {
  it('#rrggbb 原样归一化为小写', () => {
    expect(parseBgColor('#ffffff')).toBe('#ffffff')
    expect(parseBgColor('#FFFFFF')).toBe('#ffffff')
    expect(parseBgColor('#1a2B3c')).toBe('#1a2b3c')
    expect(parseBgColor(DEFAULT_BG_COLOR)).toBe('#ffffff')
  })

  it('#rgb 缩写展开', () => {
    expect(parseBgColor('#fff')).toBe('#ffffff')
    expect(parseBgColor('#ABC')).toBe('#aabbcc')
    expect(parseBgColor('#0f0')).toBe('#00ff00')
  })

  it('非法抛错', () => {
    expect(() => parseBgColor('')).toThrow(/背景色无效/)
    expect(() => parseBgColor('red')).toThrow(/背景色无效/)
    expect(() => parseBgColor('ffffff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#ff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#fffff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#fffffff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#gggggg')).toThrow(/背景色无效/)
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

describe('computeContainLayout（等比留白）', () => {
  it('横图：按高适配，左右留白', () => {
    // 800x600 → 400x400：scale=0.5 → 400x300，offsetX=0, offsetY=50
    expect(computeContainLayout(800, 600, 400, 400)).toEqual({
      drawW: 400,
      drawH: 300,
      offsetX: 0,
      offsetY: 50,
    })
  })

  it('竖图：按宽适配，上下留白', () => {
    // 600x800 → 400x400：scale=0.5 → 300x400，offsetX=50, offsetY=0
    expect(computeContainLayout(600, 800, 400, 400)).toEqual({
      drawW: 300,
      drawH: 400,
      offsetX: 50,
      offsetY: 0,
    })
  })

  it('方图进横版目标', () => {
    // 500x500 → 300x200：scale=0.4 → 200x200，offsetX=50, offsetY=0
    expect(computeContainLayout(500, 500, 300, 200)).toEqual({
      drawW: 200,
      drawH: 200,
      offsetX: 50,
      offsetY: 0,
    })
  })

  it('同比例：无留白直接填满', () => {
    expect(computeContainLayout(1920, 1080, 1280, 720)).toEqual({
      drawW: 1280,
      drawH: 720,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('放大也按同一公式', () => {
    expect(computeContainLayout(100, 100, 400, 400)).toEqual({
      drawW: 400,
      drawH: 400,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('极端纵横比保底 1px', () => {
    // 1x10000 → 1x1：scale=0.0001，drawW 本应为 0，保底 1
    expect(computeContainLayout(1, 10000, 1, 1)).toEqual({
      drawW: 1,
      drawH: 1,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeContainLayout(0, 100, 400, 400)).toThrow(/图片尺寸无效/)
    expect(() => computeContainLayout(800, 600, 0, 400)).toThrow(/图片尺寸无效/)
    expect(() => computeContainLayout(NaN, 100, 400, 400)).toThrow(/图片尺寸无效/)
    expect(() => computeContainLayout(800, Infinity, 400, 400)).toThrow(/图片尺寸无效/)
    expect(() => computeContainLayout(800, -600, 400, 400)).toThrow(/图片尺寸无效/)
  })
})

describe('computeCoverLayout（等比裁剪）', () => {
  it('横图：裁掉左右', () => {
    // 800x600 → 400x400：scale=2/3 → 裁 600x600，srcX=100, srcY=0
    expect(computeCoverLayout(800, 600, 400, 400)).toEqual({
      srcX: 100,
      srcY: 0,
      srcW: 600,
      srcH: 600,
    })
  })

  it('竖图：裁掉上下', () => {
    // 600x800 → 400x400：scale=2/3 → 裁 600x600，srcX=0, srcY=100
    expect(computeCoverLayout(600, 800, 400, 400)).toEqual({
      srcX: 0,
      srcY: 100,
      srcW: 600,
      srcH: 600,
    })
  })

  it('方图进横版目标：裁掉上下', () => {
    // 500x500 → 300x200：scale=0.6 → 裁 500x333，srcY=84（居中）
    expect(computeCoverLayout(500, 500, 300, 200)).toEqual({
      srcX: 0,
      srcY: 84,
      srcW: 500,
      srcH: 333,
    })
  })

  it('同比例：不裁剪', () => {
    expect(computeCoverLayout(1920, 1080, 1280, 720)).toEqual({
      srcX: 0,
      srcY: 0,
      srcW: 1920,
      srcH: 1080,
    })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeCoverLayout(0, 100, 400, 400)).toThrow(/图片尺寸无效/)
    expect(() => computeCoverLayout(800, 600, 400, 0)).toThrow(/图片尺寸无效/)
    expect(() => computeCoverLayout(800, NaN, 400, 400)).toThrow(/图片尺寸无效/)
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
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-dimension.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-dimension.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-dimension.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-dimension.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-dimension.png')
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
