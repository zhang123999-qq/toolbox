import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ANGLE,
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE_PERCENT,
  DEFAULT_OPACITY,
  DEFAULT_QUALITY,
  MAX_CONCURRENCY,
  MAX_FILE_SIZE,
  MAX_FILES,
  MAX_TEXT_LENGTH,
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  fontPx,
  formatToMime,
  parseAngle,
  parseColor,
  parseFontSizePercent,
  parseOpacity,
  parseOptions,
  parseQuality,
  parseWatermarkText,
  tileOrigins,
  tileSteps,
  watermarkPosition,
} from './utils'
import type { WatermarkBatchOptions } from './schema'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseWatermarkText', () => {
  it('去首尾空白后返回', () => {
    expect(parseWatermarkText('  水印  ')).toBe('水印')
  })

  it('空文本抛错', () => {
    expect(() => parseWatermarkText('')).toThrow(/水印文字不能为空/)
    expect(() => parseWatermarkText('   ')).toThrow(/水印文字不能为空/)
  })

  it('超 100 字抛错', () => {
    expect(() => parseWatermarkText('水'.repeat(MAX_TEXT_LENGTH + 1))).toThrow(/水印文字过长/)
    expect(parseWatermarkText('水'.repeat(MAX_TEXT_LENGTH))).toHaveLength(MAX_TEXT_LENGTH)
  })
})

describe('parseFontSizePercent', () => {
  it('空串用默认 6', () => {
    expect(parseFontSizePercent('')).toBe(DEFAULT_FONT_SIZE_PERCENT)
    expect(parseFontSizePercent('   ')).toBe(DEFAULT_FONT_SIZE_PERCENT)
  })

  it('正常解析 2–20', () => {
    expect(parseFontSizePercent('2')).toBe(2)
    expect(parseFontSizePercent('20')).toBe(20)
    expect(parseFontSizePercent(' 10 ')).toBe(10)
  })

  it('非法抛错', () => {
    expect(() => parseFontSizePercent('abc')).toThrow(/字号无效/)
    expect(() => parseFontSizePercent('10.5')).toThrow(/字号无效/)
    expect(() => parseFontSizePercent('1')).toThrow(/字号超出范围/)
    expect(() => parseFontSizePercent('21')).toThrow(/字号超出范围/)
  })
})

describe('parseOpacity', () => {
  it('空串用默认 50', () => {
    expect(parseOpacity('')).toBe(DEFAULT_OPACITY)
  })

  it('正常解析 10–100', () => {
    expect(parseOpacity('10')).toBe(10)
    expect(parseOpacity('100')).toBe(100)
    expect(parseOpacity(' 75 ')).toBe(75)
  })

  it('非法抛错', () => {
    expect(() => parseOpacity('abc')).toThrow(/不透明度无效/)
    expect(() => parseOpacity('9')).toThrow(/不透明度超出范围/)
    expect(() => parseOpacity('101')).toThrow(/不透明度超出范围/)
  })
})

describe('parseAngle', () => {
  it('空串用默认 0（不旋转）', () => {
    expect(parseAngle('')).toBe(DEFAULT_ANGLE)
  })

  it('正常解析 -45–45，可小数', () => {
    expect(parseAngle('-45')).toBe(-45)
    expect(parseAngle('45')).toBe(45)
    expect(parseAngle('12.5')).toBe(12.5)
  })

  it('非法抛错', () => {
    expect(() => parseAngle('abc')).toThrow(/角度无效/)
    expect(() => parseAngle('-46')).toThrow(/角度超出范围/)
    expect(() => parseAngle('46')).toThrow(/角度超出范围/)
  })
})

describe('parseColor', () => {
  it('空串用默认 #ffffff', () => {
    expect(parseColor('')).toBe(DEFAULT_COLOR)
  })

  it('合法 #rrggbb 通过并转小写', () => {
    expect(parseColor('#ff0000')).toBe('#ff0000')
    expect(parseColor('#FF0000')).toBe('#ff0000')
    expect(parseColor('  #00aaFF  ')).toBe('#00aaff')
  })

  it('非法抛错', () => {
    expect(() => parseColor('red')).toThrow(/颜色无效/)
    expect(() => parseColor('#fff')).toThrow(/颜色无效/)
    expect(() => parseColor('#gggggg')).toThrow(/颜色无效/)
  })
})

describe('parseQuality', () => {
  it('空串用默认 80', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('80.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/质量超出范围/)
    expect(() => parseQuality('101')).toThrow(/质量超出范围/)
  })
})

describe('parseOptions', () => {
  const valid: WatermarkBatchOptions = {
    text: '水印',
    position: 'bottom-right',
    fontSize: '6',
    color: '#ff0000',
    opacity: '50',
    angle: '-30',
    tile: true,
    format: 'jpeg',
    quality: '80',
  }

  it('全部合法时统一解析', () => {
    expect(parseOptions(valid)).toEqual({
      text: '水印',
      fontSizePercent: 6,
      color: '#ff0000',
      opacity: 50,
      angle: -30,
      tile: true,
      position: 'bottom-right',
      format: 'jpeg',
      quality: 80,
    })
  })

  it('任一非法即抛错', () => {
    expect(() => parseOptions({ ...valid, text: '   ' })).toThrow(/水印文字不能为空/)
    expect(() => parseOptions({ ...valid, opacity: '200' })).toThrow(/不透明度/)
  })
})

describe('watermarkPosition', () => {
  it('九宫格锚点与对齐方式', () => {
    // 800x600 图片
    expect(watermarkPosition(800, 600, 'top-left')).toEqual({
      x: 0,
      y: 0,
      textAlign: 'left',
      textBaseline: 'top',
    })
    expect(watermarkPosition(800, 600, 'top-center')).toEqual({
      x: 400,
      y: 0,
      textAlign: 'center',
      textBaseline: 'top',
    })
    expect(watermarkPosition(800, 600, 'top-right')).toEqual({
      x: 800,
      y: 0,
      textAlign: 'right',
      textBaseline: 'top',
    })
    expect(watermarkPosition(800, 600, 'middle-left')).toEqual({
      x: 0,
      y: 300,
      textAlign: 'left',
      textBaseline: 'middle',
    })
    expect(watermarkPosition(800, 600, 'center')).toEqual({
      x: 400,
      y: 300,
      textAlign: 'center',
      textBaseline: 'middle',
    })
    expect(watermarkPosition(800, 600, 'middle-right')).toEqual({
      x: 800,
      y: 300,
      textAlign: 'right',
      textBaseline: 'middle',
    })
    expect(watermarkPosition(800, 600, 'bottom-left')).toEqual({
      x: 0,
      y: 600,
      textAlign: 'left',
      textBaseline: 'bottom',
    })
    expect(watermarkPosition(800, 600, 'bottom-center')).toEqual({
      x: 400,
      y: 600,
      textAlign: 'center',
      textBaseline: 'bottom',
    })
    expect(watermarkPosition(800, 600, 'bottom-right')).toEqual({
      x: 800,
      y: 600,
      textAlign: 'right',
      textBaseline: 'bottom',
    })
  })

  it('非法尺寸抛错', () => {
    expect(() => watermarkPosition(0, 600, 'center')).toThrow(/图片尺寸无效/)
    expect(() => watermarkPosition(NaN, 600, 'center')).toThrow(/图片尺寸无效/)
    expect(() => watermarkPosition(800, Infinity, 'center')).toThrow(/图片尺寸无效/)
  })
})

describe('fontPx', () => {
  it('短边 × 百分比', () => {
    expect(fontPx(600, 10)).toBe(60)
    expect(fontPx(1000, 2)).toBe(20)
    expect(fontPx(800, 20)).toBe(160)
  })

  it('非法入参抛错', () => {
    expect(() => fontPx(0, 10)).toThrow(/图片尺寸无效/)
    expect(() => fontPx(NaN, 10)).toThrow(/图片尺寸无效/)
    expect(() => fontPx(600, 1)).toThrow(/字号百分比无效/)
    expect(() => fontPx(600, 21)).toThrow(/字号百分比无效/)
    expect(() => fontPx(600, NaN)).toThrow(/字号百分比无效/)
  })
})

describe('tileSteps', () => {
  it('横向=文本宽+字高，纵向=2.5 倍字高', () => {
    expect(tileSteps(100, 20)).toEqual({ stepX: 120, stepY: 50 })
  })

  it('非法文本尺寸抛错', () => {
    expect(() => tileSteps(0, 20)).toThrow(/水印文本尺寸无效/)
    expect(() => tileSteps(100, NaN)).toThrow(/水印文本尺寸无效/)
  })
})

describe('tileOrigins', () => {
  it('从 (0,0) 按步长铺满', () => {
    expect(tileOrigins(300, 200, 150, 100)).toEqual([
      { x: 0, y: 0 },
      { x: 150, y: 0 },
      { x: 0, y: 100 },
      { x: 150, y: 100 },
    ])
  })

  it('非法尺寸或步长返回空数组', () => {
    expect(tileOrigins(0, 200, 150, 100)).toEqual([])
    expect(tileOrigins(300, 200, 0, 100)).toEqual([])
    expect(tileOrigins(300, 200, 150, NaN)).toEqual([])
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
  })
})

describe('assertFileSizeOk / 常量', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })

  it('批量与并发上限常量符合规格', () => {
    expect(MAX_FILES).toBe(20)
    expect(MAX_CONCURRENCY).toBe(3)
  })
})
