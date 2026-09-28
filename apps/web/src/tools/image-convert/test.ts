import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUALITY,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseQuality', () => {
  it('空串用默认 100', () => {
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

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })

  it('PNG 质量不生效', () => {
    expect(effectiveQuality('png', 100)).toBeUndefined()
    expect(effectiveQuality('jpeg', 100)).toBe(1)
    expect(effectiveQuality('webp', 80)).toBe(0.8)
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -converted 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-converted.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-converted.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-converted.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-converted.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-converted.png')
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
