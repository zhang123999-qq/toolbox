import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RADIUS,
  MAX_FILE_SIZE,
  MAX_RADIUS,
  assertFileSizeOk,
  buildBlurFilter,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseRadius,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseRadius', () => {
  it('空串用默认 10', () => {
    expect(parseRadius('')).toBe(DEFAULT_RADIUS)
    expect(parseRadius('   ')).toBe(DEFAULT_RADIUS)
  })

  it('正常解析（含小数）', () => {
    expect(parseRadius('0')).toBe(0)
    expect(parseRadius('50')).toBe(50)
    expect(parseRadius(' 15 ')).toBe(15)
    expect(parseRadius('2.5')).toBe(2.5)
  })

  it('非法抛错', () => {
    expect(() => parseRadius('abc')).toThrow(/半径无效/)
    expect(() => parseRadius('Infinity')).toThrow(/半径无效/)
    expect(() => parseRadius('-1')).toThrow(/超出范围/)
    expect(() => parseRadius(String(MAX_RADIUS + 1))).toThrow(/超出范围/)
  })
})

describe('buildBlurFilter', () => {
  it('半径≤0 返回 none', () => {
    expect(buildBlurFilter(0)).toBe('none')
    expect(buildBlurFilter(-5)).toBe('none')
  })

  it('正数返回 blur(px)', () => {
    expect(buildBlurFilter(10)).toBe('blur(10px)')
    expect(buildBlurFilter(2.5)).toBe('blur(2.5px)')
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
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-blur.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-blur.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-blur.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-blur.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-blur.png')
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
