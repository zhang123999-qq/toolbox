import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BLOCK_SIZE,
  MAX_BLOCK_SIZE,
  MAX_FILE_SIZE,
  MIN_BLOCK_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseBlockSize,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseBlockSize', () => {
  it('空串用默认 16', () => {
    expect(parseBlockSize('')).toBe(DEFAULT_BLOCK_SIZE)
    expect(parseBlockSize('   ')).toBe(DEFAULT_BLOCK_SIZE)
  })

  it('正常解析边界值', () => {
    expect(parseBlockSize(String(MIN_BLOCK_SIZE))).toBe(MIN_BLOCK_SIZE)
    expect(parseBlockSize(String(MAX_BLOCK_SIZE))).toBe(MAX_BLOCK_SIZE)
    expect(parseBlockSize(' 32 ')).toBe(32)
  })

  it('非法抛错', () => {
    expect(() => parseBlockSize('abc')).toThrow(/块大小无效/)
    expect(() => parseBlockSize('16.5')).toThrow(/块大小无效/)
    expect(() => parseBlockSize('-4')).toThrow(/块大小无效/)
    expect(() => parseBlockSize('3')).toThrow(/超出范围/)
    expect(() => parseBlockSize('65')).toThrow(/超出范围/)
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
  it('替换扩展名并加 -mosaic 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-mosaic.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-mosaic.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-mosaic.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-mosaic.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-mosaic.png')
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
