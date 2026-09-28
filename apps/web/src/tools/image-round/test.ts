import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  MAX_RADIUS_PERCENT,
  MAX_RADIUS_PX,
  OUTPUT_QUALITY,
  assertFileSizeOk,
  buildOutputFileName,
  circleDiameter,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseRadius,
  radiusToPx,
  resolveFillStyle,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseRadius', () => {
  it('空串视为 0', () => {
    expect(parseRadius('', 'px')).toBe(0)
    expect(parseRadius('   ', '%')).toBe(0)
  })

  it('正常解析（整数/小数/前后空格）', () => {
    expect(parseRadius('0', 'px')).toBe(0)
    expect(parseRadius('20', 'px')).toBe(20)
    expect(parseRadius('12.5', 'px')).toBe(12.5)
    expect(parseRadius(' 50 ', '%')).toBe(50)
  })

  it('边界值恰好等于上限不抛错', () => {
    expect(parseRadius(String(MAX_RADIUS_PX), 'px')).toBe(MAX_RADIUS_PX)
    expect(parseRadius(String(MAX_RADIUS_PERCENT), '%')).toBe(MAX_RADIUS_PERCENT)
  })

  it('非法格式抛错', () => {
    expect(() => parseRadius('abc', 'px')).toThrow(/半径无效/)
    expect(() => parseRadius('-5', 'px')).toThrow(/半径无效/)
    expect(() => parseRadius('12.5.3', 'px')).toThrow(/半径无效/)
    expect(() => parseRadius('1e3', 'px')).toThrow(/半径无效/)
    expect(() => parseRadius('.', 'px')).toThrow(/半径无效/)
  })

  it('px 超过上限抛错', () => {
    expect(() => parseRadius(String(MAX_RADIUS_PX + 1), 'px')).toThrow(/半径过大/)
    expect(() => parseRadius(String(MAX_RADIUS_PX + 1), 'px')).toThrow(/16384px/)
  })

  it('% 超过上限抛错', () => {
    expect(() => parseRadius('100.1', '%')).toThrow(/半径过大/)
    expect(() => parseRadius('101', '%')).toThrow(/100%/)
  })
})

describe('radiusToPx', () => {
  it('px 直接返回', () => {
    expect(radiusToPx(20, 'px', 800, 600)).toBe(20)
    expect(radiusToPx(0, 'px', 800, 600)).toBe(0)
  })

  it('% 相对短边换算', () => {
    // 10% × 短边 600 = 60
    expect(radiusToPx(10, '%', 800, 600)).toBe(60)
    // 竖图：短边是宽
    expect(radiusToPx(50, '%', 400, 900)).toBe(200)
  })

  it('钳制到短边一半', () => {
    // px 9999 → 短边 600 的一半 300
    expect(radiusToPx(9999, 'px', 800, 600)).toBe(300)
    // 100% → 600 → 钳制到 300
    expect(radiusToPx(100, '%', 800, 600)).toBe(300)
  })

  it('非法半径抛错', () => {
    expect(() => radiusToPx(-1, 'px', 800, 600)).toThrow(/半径无效/)
    expect(() => radiusToPx(NaN, 'px', 800, 600)).toThrow(/半径无效/)
  })

  it('非法尺寸抛错', () => {
    expect(() => radiusToPx(20, 'px', 0, 600)).toThrow(/图片尺寸无效/)
    expect(() => radiusToPx(20, 'px', NaN, 600)).toThrow(/图片尺寸无效/)
    expect(() => radiusToPx(20, 'px', 800, -1)).toThrow(/图片尺寸无效/)
  })
})

describe('circleDiameter', () => {
  it('取短边', () => {
    expect(circleDiameter(800, 600)).toBe(600)
    expect(circleDiameter(400, 900)).toBe(400)
    expect(circleDiameter(500, 500)).toBe(500)
  })

  it('非法尺寸抛错', () => {
    expect(() => circleDiameter(0, 100)).toThrow(/图片尺寸无效/)
    expect(() => circleDiameter(Infinity, 100)).toThrow(/图片尺寸无效/)
  })
})

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('jpeg')).toBe('image/jpeg')
  })

  it('JPEG 固定最高质量，PNG 质量不生效', () => {
    expect(effectiveQuality('png')).toBeUndefined()
    expect(effectiveQuality('jpeg')).toBe(OUTPUT_QUALITY)
    expect(effectiveQuality('jpeg')).toBe(1)
  })
})

describe('resolveFillStyle', () => {
  it('透明 + PNG 返回 null（保持透明）', () => {
    expect(resolveFillStyle('transparent', '#123456', 'png')).toBeNull()
  })

  it('透明 + JPEG 按白色填充', () => {
    expect(resolveFillStyle('transparent', '#123456', 'jpeg')).toBe('#ffffff')
  })

  it('白色背景两种格式都填白色', () => {
    expect(resolveFillStyle('white', '#123456', 'png')).toBe('#ffffff')
    expect(resolveFillStyle('white', '#123456', 'jpeg')).toBe('#ffffff')
  })

  it('自定义背景透传颜色', () => {
    expect(resolveFillStyle('custom', '#a1b2c3', 'png')).toBe('#a1b2c3')
    expect(resolveFillStyle('custom', '#a1b2c3', 'jpeg')).toBe('#a1b2c3')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加后缀', () => {
    expect(buildOutputFileName('photo.png', 'png')).toBe('photo-rounded.png')
    expect(buildOutputFileName('a.jpeg', 'jpeg')).toBe('a-rounded.jpg')
    expect(buildOutputFileName('noext', 'png')).toBe('noext-rounded.png')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-rounded.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-rounded.png')
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
