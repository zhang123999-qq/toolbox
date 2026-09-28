import { describe, expect, it } from 'vitest'
import {
  ASPECT_PRESETS,
  DEFAULT_QUALITY,
  MAX_CROP_VALUE,
  MAX_FILE_SIZE,
  applyAspectRatio,
  aspectRatioValue,
  assertFileSizeOk,
  buildOutputFileName,
  centerSquareRect,
  clampRectToImage,
  effectiveQuality,
  errorMessage,
  formatToMime,
  maxRect,
  parseCropNumber,
  parseQuality,
  rectToPercentStyle,
} from './utils'
import type { CropRect } from './utils'

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

describe('parseCropNumber', () => {
  it('空串抛错', () => {
    expect(() => parseCropNumber('')).toThrow(/不能为空/)
    expect(() => parseCropNumber('   ')).toThrow(/不能为空/)
  })

  it('正常解析非负整数', () => {
    expect(parseCropNumber('0')).toBe(0)
    expect(parseCropNumber('42')).toBe(42)
    expect(parseCropNumber(' 007 ')).toBe(7)
    expect(parseCropNumber(String(MAX_CROP_VALUE))).toBe(MAX_CROP_VALUE)
  })

  it('非法抛错', () => {
    expect(() => parseCropNumber('abc')).toThrow(/裁剪参数无效/)
    expect(() => parseCropNumber('-5')).toThrow(/裁剪参数无效/)
    expect(() => parseCropNumber('12.5')).toThrow(/裁剪参数无效/)
    expect(() => parseCropNumber(String(MAX_CROP_VALUE + 1))).toThrow(/裁剪参数过大/)
  })
})

describe('clampRectToImage', () => {
  it('框内矩形原样返回', () => {
    expect(clampRectToImage({ x: 10, y: 20, width: 100, height: 80 }, 800, 600)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    })
  })

  it('坐标钳制到图片内', () => {
    // 负坐标 → 0
    expect(clampRectToImage({ x: -5, y: -10, width: 100, height: 100 }, 800, 600).x).toBe(0)
    expect(clampRectToImage({ x: -5, y: -10, width: 100, height: 100 }, 800, 600).y).toBe(0)
    // 超出右/下边界 → 贴边
    const r = clampRectToImage({ x: 900, y: 700, width: 50, height: 50 }, 800, 600)
    expect(r.x).toBe(799)
    expect(r.y).toBe(599)
  })

  it('宽高至少 1px，超出部分裁掉', () => {
    // 0/负宽高 → 1
    const r1 = clampRectToImage({ x: 10, y: 10, width: 0, height: -3 }, 800, 600)
    expect(r1.width).toBe(1)
    expect(r1.height).toBe(1)
    // 宽高超出图片 → 收敛到边界
    const r2 = clampRectToImage({ x: 700, y: 500, width: 500, height: 500 }, 800, 600)
    expect(r2).toEqual({ x: 700, y: 500, width: 100, height: 100 })
  })

  it('非法图片尺寸抛错', () => {
    const rect: CropRect = { x: 0, y: 0, width: 10, height: 10 }
    expect(() => clampRectToImage(rect, 0, 600)).toThrow(/图片尺寸无效/)
    expect(() => clampRectToImage(rect, 800, -1)).toThrow(/图片尺寸无效/)
    expect(() => clampRectToImage(rect, NaN, 600)).toThrow(/图片尺寸无效/)
  })
})

describe('aspectRatioValue', () => {
  it('free 返回 undefined', () => {
    expect(aspectRatioValue('free')).toBeUndefined()
  })

  it('各预设返回对应比值', () => {
    expect(aspectRatioValue('1:1')).toBe(1)
    expect(aspectRatioValue('4:3')).toBeCloseTo(4 / 3)
    expect(aspectRatioValue('3:4')).toBeCloseTo(3 / 4)
    expect(aspectRatioValue('16:9')).toBeCloseTo(16 / 9)
    expect(aspectRatioValue('9:16')).toBeCloseTo(9 / 16)
  })

  it('预设表与类型一致', () => {
    expect(ASPECT_PRESETS).toEqual(['free', '1:1', '4:3', '3:4', '16:9', '9:16'])
  })
})

describe('applyAspectRatio', () => {
  it('free 原样返回（新对象）', () => {
    const rect: CropRect = { x: 10, y: 20, width: 100, height: 80 }
    const out = applyAspectRatio(rect, 'free', 800, 600)
    expect(out).toEqual(rect)
    expect(out).not.toBe(rect)
  })

  it('由宽算高并按原中心居中', () => {
    // 800x600 图，矩形(100,50,400,300) → 1:1：宽 400 → 高 400，中心(300,200) → (100,0,400,400)
    expect(applyAspectRatio({ x: 100, y: 50, width: 400, height: 300 }, '1:1', 800, 600)).toEqual({
      x: 100,
      y: 0,
      width: 400,
      height: 400,
    })
  })

  it('算出的高超出图片时钳制', () => {
    // 800x600 图整图矩形 → 16:9：高=450，中心(400,300) → (0,75,800,450)
    expect(applyAspectRatio({ x: 0, y: 0, width: 800, height: 600 }, '16:9', 800, 600)).toEqual({
      x: 0,
      y: 75,
      width: 800,
      height: 450,
    })
    // 右下角矩形 → 1:1：中心越界，钳制后收敛
    expect(applyAspectRatio({ x: 700, y: 500, width: 200, height: 200 }, '1:1', 800, 600)).toEqual({
      x: 700,
      y: 500,
      width: 100,
      height: 100,
    })
  })

  it('非法图片尺寸抛错', () => {
    expect(() => applyAspectRatio({ x: 0, y: 0, width: 10, height: 10 }, '1:1', 0, 600)).toThrow(
      /图片尺寸无效/,
    )
  })
})

describe('centerSquareRect', () => {
  it('横图/竖图/方图均居中', () => {
    expect(centerSquareRect(800, 600)).toEqual({ x: 100, y: 0, width: 600, height: 600 })
    expect(centerSquareRect(600, 800)).toEqual({ x: 0, y: 100, width: 600, height: 600 })
    expect(centerSquareRect(500, 500)).toEqual({ x: 0, y: 0, width: 500, height: 500 })
  })

  it('非法尺寸抛错', () => {
    expect(() => centerSquareRect(0, 600)).toThrow(/图片尺寸无效/)
    expect(() => centerSquareRect(800, NaN)).toThrow(/图片尺寸无效/)
  })
})

describe('maxRect', () => {
  it('返回整图矩形', () => {
    expect(maxRect(800, 600)).toEqual({ x: 0, y: 0, width: 800, height: 600 })
  })

  it('非法尺寸抛错', () => {
    expect(() => maxRect(-1, 600)).toThrow(/图片尺寸无效/)
  })
})

describe('rectToPercentStyle', () => {
  it('整图 → 0%/0%/100%/100%', () => {
    expect(rectToPercentStyle({ x: 0, y: 0, width: 800, height: 600 }, 800, 600)).toEqual({
      left: '0%',
      top: '0%',
      width: '100%',
      height: '100%',
    })
  })

  it('局部矩形按比例换算', () => {
    expect(rectToPercentStyle({ x: 200, y: 150, width: 400, height: 300 }, 800, 600)).toEqual({
      left: '25%',
      top: '25%',
      width: '50%',
      height: '50%',
    })
  })

  it('非法图片尺寸抛错', () => {
    expect(() => rectToPercentStyle({ x: 0, y: 0, width: 10, height: 10 }, 0, 600)).toThrow(
      /图片尺寸无效/,
    )
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
  it('替换扩展名并加 -cropped 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-cropped.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-cropped.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-cropped.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-cropped.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-cropped.png')
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
