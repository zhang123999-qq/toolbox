import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ANGLE,
  DEFAULT_QUALITY,
  MAX_ANGLE,
  MAX_CONCURRENCY,
  MAX_FILE_SIZE,
  MAX_FILES,
  MIN_ANGLE,
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  formatToMime,
  normalizeAngle,
  parseAngle,
  parseOptions,
  parseQuality,
  rotatedSize,
} from './utils'
import type { RotateBatchOptions } from './schema'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseAngle', () => {
  it('空串用默认 0', () => {
    expect(parseAngle('')).toBe(DEFAULT_ANGLE)
    expect(parseAngle('   ')).toBe(DEFAULT_ANGLE)
  })

  it('正常解析整数与小数', () => {
    expect(parseAngle('90')).toBe(90)
    expect(parseAngle('-90')).toBe(-90)
    expect(parseAngle('45.5')).toBe(45.5)
    expect(parseAngle('  30 ')).toBe(30)
    expect(parseAngle('+30')).toBe(30)
    expect(parseAngle('.5')).toBe(0.5)
    expect(parseAngle('360')).toBe(360)
    expect(parseAngle('-360')).toBe(-360)
  })

  it('非法格式抛错', () => {
    expect(() => parseAngle('abc')).toThrow(/角度无效/)
    expect(() => parseAngle('90deg')).toThrow(/角度无效/)
    expect(() => parseAngle('1.2.3')).toThrow(/角度无效/)
    expect(() => parseAngle('--90')).toThrow(/角度无效/)
  })

  it('超出 -360~360 抛错', () => {
    expect(() => parseAngle(String(MAX_ANGLE + 1))).toThrow(/角度超出范围/)
    expect(() => parseAngle(String(MIN_ANGLE - 1))).toThrow(/角度超出范围/)
  })
})

describe('normalizeAngle', () => {
  it('归一化到 [0, 360)', () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(90)).toBe(90)
    expect(normalizeAngle(360)).toBe(0)
    expect(normalizeAngle(450)).toBe(90)
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(-360)).toBe(0)
  })
})

describe('rotatedSize', () => {
  it('0° 原样返回', () => {
    expect(rotatedSize(800, 600, 0)).toEqual({ width: 800, height: 600 })
    expect(rotatedSize(800, 600, 360)).toEqual({ width: 800, height: 600 })
  })

  it('90° 奇数倍精确互换宽高', () => {
    expect(rotatedSize(800, 600, 90)).toEqual({ width: 600, height: 800 })
    expect(rotatedSize(800, 600, 270)).toEqual({ width: 600, height: 800 })
    expect(rotatedSize(1920, 1080, 90)).toEqual({ width: 1080, height: 1920 })
  })

  it('180° 尺寸不变', () => {
    expect(rotatedSize(800, 600, 180)).toEqual({ width: 800, height: 600 })
  })

  it('负角度归一化后计算', () => {
    expect(rotatedSize(800, 600, -90)).toEqual({ width: 600, height: 800 })
    expect(rotatedSize(800, 600, -45)).toEqual({ width: 990, height: 990 })
  })

  it('任意角度按包络矩形四舍五入', () => {
    // 1400 × cos45° = 989.95 → 990
    expect(rotatedSize(800, 600, 45)).toEqual({ width: 990, height: 990 })
    expect(rotatedSize(100, 200, 30)).toEqual({ width: 187, height: 223 })
    expect(rotatedSize(800, 600, 15)).toEqual({ width: 928, height: 787 })
    expect(rotatedSize(100, 100, 22.5)).toEqual({ width: 131, height: 131 })
  })

  it('极小尺寸保底 1px', () => {
    expect(rotatedSize(1, 1, 45)).toEqual({ width: 1, height: 1 })
    expect(rotatedSize(3, 1, 45)).toEqual({ width: 3, height: 3 })
  })

  it('非法尺寸抛错', () => {
    expect(() => rotatedSize(0, 100, 90)).toThrow(/图片尺寸无效/)
    expect(() => rotatedSize(-1, 100, 90)).toThrow(/图片尺寸无效/)
    expect(() => rotatedSize(NaN, 100, 90)).toThrow(/图片尺寸无效/)
    expect(() => rotatedSize(100, Infinity, 90)).toThrow(/图片尺寸无效/)
  })

  it('非法角度抛错', () => {
    expect(() => rotatedSize(100, 100, NaN)).toThrow(/角度无效/)
    expect(() => rotatedSize(100, 100, Infinity)).toThrow(/角度无效/)
  })
})

describe('parseQuality', () => {
  it('空串用默认 90', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
    expect(parseQuality('   ')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
    expect(parseQuality(' 90 ')).toBe(90)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('85.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
  })
})

describe('parseOptions', () => {
  const base: RotateBatchOptions = { angle: '90', format: 'jpeg', quality: '90' }

  it('全部合法时解析出数值选项', () => {
    expect(parseOptions(base)).toEqual({ angle: 90, format: 'jpeg', quality: 90 })
    expect(parseOptions({ angle: '-45.5', format: 'png', quality: '' })).toEqual({
      angle: -45.5,
      format: 'png',
      quality: DEFAULT_QUALITY,
    })
  })

  it('角度非法时抛错', () => {
    expect(() => parseOptions({ ...base, angle: '400' })).toThrow(/角度超出范围/)
  })

  it('质量非法时抛错', () => {
    expect(() => parseOptions({ ...base, quality: '0' })).toThrow(/质量超出范围/)
  })
})

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })

  it('PNG 质量不生效', () => {
    expect(effectiveQuality('png', 90)).toBeUndefined()
    expect(effectiveQuality('jpeg', 90)).toBe(0.9)
    expect(effectiveQuality('webp', 100)).toBe(1)
  })
})

describe('buildOutputFileName', () => {
  it('加 -rotated 后缀并替换扩展名', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-rotated.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-rotated.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-rotated.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-rotated.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-rotated.png')
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

describe('批量约束常量', () => {
  it('总数上限 20、并发上限 3', () => {
    expect(MAX_FILES).toBe(20)
    expect(MAX_CONCURRENCY).toBe(3)
  })
})
