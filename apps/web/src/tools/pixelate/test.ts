import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PIXEL_SIZE,
  MAX_FILE_SIZE,
  MAX_PIXEL_SIZE,
  MIN_PIXEL_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parsePixelSize,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parsePixelSize', () => {
  it('空串用默认 8', () => {
    expect(parsePixelSize('')).toBe(DEFAULT_PIXEL_SIZE)
    expect(parsePixelSize('   ')).toBe(DEFAULT_PIXEL_SIZE)
  })

  it('正常解析（含首尾空格）', () => {
    expect(parsePixelSize('2')).toBe(MIN_PIXEL_SIZE)
    expect(parsePixelSize('64')).toBe(MAX_PIXEL_SIZE)
    expect(parsePixelSize(' 16 ')).toBe(16)
  })

  it('非法抛错', () => {
    expect(() => parsePixelSize('abc')).toThrow(/像素块大小无效/)
    expect(() => parsePixelSize('8.5')).toThrow(/像素块大小无效/)
    expect(() => parsePixelSize('-1')).toThrow(/像素块大小无效/)
    expect(() => parsePixelSize('0')).toThrow(/超出范围/)
    expect(() => parsePixelSize('1')).toThrow(/超出范围/)
    expect(() => parsePixelSize('65')).toThrow(/超出范围/)
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
  it('替换扩展名并加 -pixelate 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-pixelate.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-pixelate.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-pixelate.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-pixelate.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-pixelate.png')
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
