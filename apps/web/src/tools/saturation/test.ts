import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SATURATION,
  MAX_FILE_SIZE,
  SATURATION_MAX,
  assertFileSizeOk,
  buildOutputFileName,
  buildSaturateFilter,
  errorMessage,
  formatToMime,
  parseSaturation,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseSaturation', () => {
  it('空串用默认 100', () => {
    expect(parseSaturation('')).toBe(DEFAULT_SATURATION)
    expect(parseSaturation('   ')).toBe(DEFAULT_SATURATION)
  })

  it('正常解析', () => {
    expect(parseSaturation('0')).toBe(0)
    expect(parseSaturation('100')).toBe(100)
    expect(parseSaturation('200')).toBe(200)
    expect(parseSaturation(' 150 ')).toBe(150)
  })

  it('非法抛错', () => {
    expect(() => parseSaturation('abc')).toThrow(/饱和度无效/)
    expect(() => parseSaturation('12.5')).toThrow(/饱和度无效/)
    expect(() => parseSaturation('-1')).toThrow(/饱和度无效/)
    expect(() => parseSaturation(String(SATURATION_MAX + 1))).toThrow(/超出范围/)
  })
})

describe('buildSaturateFilter', () => {
  it('按饱和度构造 ctx.filter 字符串，100 为恒等变换', () => {
    expect(buildSaturateFilter(0)).toBe('saturate(0)')
    expect(buildSaturateFilter(100)).toBe('saturate(1)')
    expect(buildSaturateFilter(150)).toBe('saturate(1.5)')
    expect(buildSaturateFilter(200)).toBe('saturate(2)')
  })
})

describe('formatToMime', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-saturation.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-saturation.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-saturation.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-saturation.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-saturation.png')
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
