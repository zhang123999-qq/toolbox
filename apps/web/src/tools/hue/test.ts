import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HUE,
  HUE_MAX,
  HUE_MIN,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildHueRotateFilter,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseHue,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseHue', () => {
  it('空串用默认 0', () => {
    expect(parseHue('')).toBe(DEFAULT_HUE)
    expect(parseHue('   ')).toBe(DEFAULT_HUE)
  })

  it('正常解析（含负数与边界）', () => {
    expect(parseHue('90')).toBe(90)
    expect(parseHue('-90')).toBe(-90)
    expect(parseHue(' 45 ')).toBe(45)
    expect(parseHue(String(HUE_MIN))).toBe(HUE_MIN)
    expect(parseHue(String(HUE_MAX))).toBe(HUE_MAX)
  })

  it('非法抛错', () => {
    expect(() => parseHue('abc')).toThrow(/色相角度无效/)
    expect(() => parseHue('12.5')).toThrow(/色相角度无效/)
    expect(() => parseHue('--90')).toThrow(/色相角度无效/)
    expect(() => parseHue(String(HUE_MAX + 1))).toThrow(/超出范围/)
    expect(() => parseHue(String(HUE_MIN - 1))).toThrow(/超出范围/)
  })
})

describe('buildHueRotateFilter', () => {
  it('hue=0 返回 none（输出与原图一致）', () => {
    expect(buildHueRotateFilter(0)).toBe('none')
  })

  it('非零返回 hue-rotate() 字符串', () => {
    expect(buildHueRotateFilter(90)).toBe('hue-rotate(90deg)')
    expect(buildHueRotateFilter(-45)).toBe('hue-rotate(-45deg)')
    expect(buildHueRotateFilter(180)).toBe('hue-rotate(180deg)')
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
  it('替换扩展名并加 -hue 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-hue.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-hue.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-hue.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-hue.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-hue.png')
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
