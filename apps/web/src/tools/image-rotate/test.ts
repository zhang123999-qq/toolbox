import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUALITY,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  formatToMime,
  isRightAngle,
  normalizeAngle,
  parseAngle,
  parseQuality,
  rotatedBounds,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('parseAngle', () => {
  it('空串/空白串为 0', () => {
    expect(parseAngle('')).toBe(0)
    expect(parseAngle('   ')).toBe(0)
  })

  it('正常解析整数与小数', () => {
    expect(parseAngle('90')).toBe(90)
    expect(parseAngle('-45.5')).toBe(-45.5)
    expect(parseAngle('+30')).toBe(30)
    expect(parseAngle('.5')).toBe(0.5)
    expect(parseAngle(' 45 ')).toBe(45)
  })

  it('边界 -360/360 合法', () => {
    expect(parseAngle('-360')).toBe(-360)
    expect(parseAngle('360')).toBe(360)
    expect(parseAngle('0')).toBe(0)
  })

  it('非法抛错', () => {
    expect(() => parseAngle('abc')).toThrow(/角度无效/)
    expect(() => parseAngle('12a')).toThrow(/角度无效/)
    expect(() => parseAngle('--5')).toThrow(/角度无效/)
    expect(() => parseAngle('1.2.3')).toThrow(/角度无效/)
    expect(() => parseAngle('1e2')).toThrow(/角度无效/)
    expect(() => parseAngle('NaN')).toThrow(/角度无效/)
  })

  it('超范围抛错', () => {
    expect(() => parseAngle('361')).toThrow(/角度超出范围/)
    expect(() => parseAngle('-360.1')).toThrow(/角度超出范围/)
  })
})

describe('normalizeAngle', () => {
  it('归一化到 [0,360)', () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(45.5)).toBe(45.5)
    expect(normalizeAngle(360)).toBe(0)
    expect(normalizeAngle(720)).toBe(0)
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(-360)).toBe(0)
    expect(normalizeAngle(-450)).toBe(270)
    expect(normalizeAngle(405)).toBe(45)
  })
})

describe('isRightAngle', () => {
  it('直角返回 true', () => {
    expect(isRightAngle(0)).toBe(true)
    expect(isRightAngle(90)).toBe(true)
    expect(isRightAngle(180)).toBe(true)
    expect(isRightAngle(270)).toBe(true)
    expect(isRightAngle(360)).toBe(true)
    expect(isRightAngle(-90)).toBe(true)
    expect(isRightAngle(450)).toBe(true)
  })

  it('非直角返回 false', () => {
    expect(isRightAngle(45)).toBe(false)
    expect(isRightAngle(45.5)).toBe(false)
    expect(isRightAngle(-45)).toBe(false)
    expect(isRightAngle(89.9)).toBe(false)
  })
})

describe('rotatedBounds', () => {
  it('直角：0/180 不变，90/270 宽高互换', () => {
    expect(rotatedBounds(200, 100, 0)).toEqual({ width: 200, height: 100 })
    expect(rotatedBounds(200, 100, 180)).toEqual({ width: 200, height: 100 })
    expect(rotatedBounds(200, 100, 90)).toEqual({ width: 100, height: 200 })
    expect(rotatedBounds(200, 100, 270)).toEqual({ width: 100, height: 200 })
  })

  it('四个象限的包围盒', () => {
    // 第一象限 30°：|200·cos30|+|100·sin30| = 223.2 → 223
    expect(rotatedBounds(200, 100, 30)).toEqual({ width: 223, height: 187 })
    // 第二象限 120°：|cos|、|sin| 与 60° 相同
    expect(rotatedBounds(200, 100, 120)).toEqual({ width: 187, height: 223 })
    // 第三象限 210°：与 30° 相同
    expect(rotatedBounds(200, 100, 210)).toEqual({ width: 223, height: 187 })
    // 第四象限 330°：与 30° 相同
    expect(rotatedBounds(200, 100, 330)).toEqual({ width: 223, height: 187 })
  })

  it('负角度先归一化再计算', () => {
    expect(rotatedBounds(200, 100, -90)).toEqual({ width: 100, height: 200 })
    expect(rotatedBounds(200, 100, -30)).toEqual({ width: 223, height: 187 })
  })

  it('小数角度', () => {
    expect(rotatedBounds(200, 100, 45.5)).toEqual({ width: 212, height: 213 })
    expect(rotatedBounds(100, 100, 45)).toEqual({ width: 141, height: 141 })
  })

  it('极小尺寸保底 1px', () => {
    expect(rotatedBounds(0.1, 0.1, 45)).toEqual({ width: 1, height: 1 })
  })

  it('非法尺寸/角度抛错', () => {
    expect(() => rotatedBounds(0, 100, 0)).toThrow(/图片尺寸无效/)
    expect(() => rotatedBounds(-5, 100, 0)).toThrow(/图片尺寸无效/)
    expect(() => rotatedBounds(NaN, 100, 0)).toThrow(/图片尺寸无效/)
    expect(() => rotatedBounds(100, Infinity, 0)).toThrow(/图片尺寸无效/)
    expect(() => rotatedBounds(100, 100, NaN)).toThrow(/角度无效/)
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
    expect(parseQuality(' 95 ')).toBe(95)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('85.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
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
  it('替换扩展名并加后缀', () => {
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
