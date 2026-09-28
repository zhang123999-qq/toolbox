import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LEVEL,
  LEVEL_MAX,
  LEVEL_MIN,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildBrightnessContrastFilter,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseLevel,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseLevel', () => {
  it('空串用默认 0', () => {
    expect(parseLevel('')).toBe(DEFAULT_LEVEL)
    expect(parseLevel('   ')).toBe(DEFAULT_LEVEL)
  })

  it('正常解析（含负数与边界）', () => {
    expect(parseLevel('0')).toBe(0)
    expect(parseLevel(' 25 ')).toBe(25)
    expect(parseLevel('-50')).toBe(-50)
    expect(parseLevel(String(LEVEL_MIN))).toBe(LEVEL_MIN)
    expect(parseLevel(String(LEVEL_MAX))).toBe(LEVEL_MAX)
  })

  it('非整数抛错', () => {
    expect(() => parseLevel('abc')).toThrow(/取值无效/)
    expect(() => parseLevel('85.5')).toThrow(/取值无效/)
    expect(() => parseLevel('12px')).toThrow(/取值无效/)
  })

  it('超范围抛错', () => {
    expect(() => parseLevel(String(LEVEL_MAX + 1))).toThrow(/超出范围/)
    expect(() => parseLevel(String(LEVEL_MIN - 1))).toThrow(/超出范围/)
  })
})

describe('buildBrightnessContrastFilter', () => {
  it('两项都为 0 返回 none（等价原图）', () => {
    expect(buildBrightnessContrastFilter(0, 0)).toBe('none')
  })

  it('只调亮度', () => {
    expect(buildBrightnessContrastFilter(20, 0)).toBe('brightness(1.2) contrast(1)')
  })

  it('只调对比度（负值降低）', () => {
    expect(buildBrightnessContrastFilter(0, -30)).toBe('brightness(1) contrast(0.7)')
  })

  it('两项都调', () => {
    expect(buildBrightnessContrastFilter(50, -50)).toBe('brightness(1.5) contrast(0.5)')
    expect(buildBrightnessContrastFilter(-100, 100)).toBe('brightness(0) contrast(2)')
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
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-brightness-contrast.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-brightness-contrast.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-brightness-contrast.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-brightness-contrast.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-brightness-contrast.png')
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
