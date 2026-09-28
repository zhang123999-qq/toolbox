import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUALITY,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  flipTransform,
  formatToMime,
  parseFlipOptions,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseFlipOptions', () => {
  it('至少勾选一种时原样返回', () => {
    expect(parseFlipOptions({ horizontal: true, vertical: false })).toEqual({
      horizontal: true,
      vertical: false,
    })
    expect(parseFlipOptions({ horizontal: false, vertical: true })).toEqual({
      horizontal: false,
      vertical: true,
    })
    expect(parseFlipOptions({ horizontal: true, vertical: true })).toEqual({
      horizontal: true,
      vertical: true,
    })
  })

  it('两个都不勾选时抛错（不可表示做进校验）', () => {
    expect(() => parseFlipOptions({ horizontal: false, vertical: false })).toThrow(
      /请至少选择一种翻转方式/,
    )
  })
})

describe('flipTransform', () => {
  it('四种组合的 scale 系数', () => {
    // 都不翻转（上游校验会拦截，这里只验证纯数据映射）
    expect(flipTransform({ horizontal: false, vertical: false })).toEqual({
      scaleX: 1,
      scaleY: 1,
    })
    // 仅水平翻转
    expect(flipTransform({ horizontal: true, vertical: false })).toEqual({
      scaleX: -1,
      scaleY: 1,
    })
    // 仅垂直翻转
    expect(flipTransform({ horizontal: false, vertical: true })).toEqual({
      scaleX: 1,
      scaleY: -1,
    })
    // 双选 = 旋转 180°
    expect(flipTransform({ horizontal: true, vertical: true })).toEqual({
      scaleX: -1,
      scaleY: -1,
    })
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
  it('替换扩展名并加 -flipped 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-flipped.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-flipped.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-flipped.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-flipped.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-flipped.png')
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
