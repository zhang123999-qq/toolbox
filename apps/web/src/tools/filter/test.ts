import { describe, expect, it } from 'vitest'
import {
  FILTER_PRESETS,
  FILTER_PRESET_ORDER,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parsePreset,
} from './utils'

describe('FILTER_PRESETS', () => {
  it('8 种预设齐全且 filter 字符串符合任务约定', () => {
    expect(FILTER_PRESET_ORDER).toHaveLength(8)
    expect(FILTER_PRESETS).toEqual({
      none: { filter: 'none' },
      grayscale: { filter: 'grayscale(1)' },
      sepia: { filter: 'sepia(0.9)' },
      invert: { filter: 'invert(1)' },
      warm: { filter: 'sepia(0.35) saturate(1.4) contrast(1.05)' },
      cool: { filter: 'saturate(0.9) hue-rotate(-15deg) brightness(1.05)' },
      fade: { filter: 'contrast(0.85) brightness(1.1) saturate(0.7)' },
      vivid: { filter: 'saturate(1.6) contrast(1.15)' },
    })
  })

  it('展示顺序与预设表键序一致', () => {
    expect([...FILTER_PRESET_ORDER]).toEqual(Object.keys(FILTER_PRESETS))
  })
})

describe('parsePreset', () => {
  it('合法预设原样返回', () => {
    for (const p of FILTER_PRESET_ORDER) {
      expect(parsePreset(p)).toBe(p)
    }
  })

  it('非法预设抛错', () => {
    expect(() => parsePreset('blur')).toThrow(/未知滤镜预设/)
    expect(() => parsePreset('')).toThrow(/未知滤镜预设/)
    expect(() => parsePreset('GRAYSCALE')).toThrow(/未知滤镜预设/)
  })
})

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
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

describe('formatToMime', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -filter 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-filter.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-filter.png')
    expect(buildOutputFileName('b.jpg', 'webp')).toBe('b-filter.webp')
  })

  it('无扩展名直接拼接', () => {
    expect(buildOutputFileName('noext', 'png')).toBe('noext-filter.png')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-filter.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-filter.png')
  })
})
