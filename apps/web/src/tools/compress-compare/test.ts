import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  SCHEMES,
  assertFileSizeOk,
  bestSchemeId,
  buildOutputFileName,
  compressionRatioText,
  enabledSchemes,
  errorMessage,
  parseEnabledSchemes,
  schemeQualityParam,
  schemeToMime,
} from './utils'

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

describe('SCHEMES', () => {
  it('固定 6 组方案，顺序即卡片展示顺序', () => {
    expect(SCHEMES.map((s) => s.id)).toEqual([
      'jpeg-q90',
      'jpeg-q70',
      'jpeg-q50',
      'webp-q80',
      'webp-q60',
      'png',
    ])
  })
})

describe('parseEnabledSchemes', () => {
  it('string 数组：过滤未知 id、非字符串与重复，保持 SCHEMES 顺序', () => {
    expect(parseEnabledSchemes(['png', 'jpeg-q90', 'unknown', 123, 'png'])).toEqual([
      'jpeg-q90',
      'png',
    ])
  })

  it('record：只保留值为 true 的已知 id', () => {
    expect(
      parseEnabledSchemes({
        'jpeg-q70': true,
        'webp-q60': false,
        'no-such': true,
        'jpeg-q90': true,
      }),
    ).toEqual(['jpeg-q90', 'jpeg-q70'])
  })

  it('0 组时抛错', () => {
    expect(() => parseEnabledSchemes([])).toThrow(/至少启用 1 组/)
    expect(() => parseEnabledSchemes({ 'jpeg-q90': false })).toThrow(/至少启用 1 组/)
    expect(() => parseEnabledSchemes(['unknown'])).toThrow(/至少启用 1 组/)
  })

  it('非法参数抛错', () => {
    expect(() => parseEnabledSchemes(null)).toThrow(/参数无效/)
    expect(() => parseEnabledSchemes('jpeg-q90')).toThrow(/参数无效/)
    expect(() => parseEnabledSchemes(42)).toThrow(/参数无效/)
    expect(() => parseEnabledSchemes(undefined)).toThrow(/参数无效/)
  })
})

describe('enabledSchemes', () => {
  it('返回方案对象（SCHEMES 顺序）', () => {
    const list = enabledSchemes(['png', 'jpeg-q50'])
    expect(list.map((s) => s.id)).toEqual(['jpeg-q50', 'png'])
    expect(list[0]).toMatchObject({ format: 'jpeg', quality: 50 })
    expect(list[1]).toMatchObject({ format: 'png', quality: undefined })
  })

  it('0 组时抛错', () => {
    expect(() => enabledSchemes([])).toThrow(/至少启用 1 组/)
  })
})

describe('schemeToMime / schemeQualityParam', () => {
  it('方案转 MIME', () => {
    expect(schemeToMime(SCHEMES[0])).toBe('image/jpeg')
    expect(schemeToMime(SCHEMES[3])).toBe('image/webp')
    expect(schemeToMime(SCHEMES[5])).toBe('image/png')
  })

  it('质量转 canvas 参数；PNG 无损返回 undefined', () => {
    expect(schemeQualityParam(SCHEMES[0])).toBe(0.9)
    expect(schemeQualityParam(SCHEMES[4])).toBe(0.6)
    expect(schemeQualityParam(SCHEMES[5])).toBeUndefined()
  })
})

describe('buildOutputFileName', () => {
  it('按方案加后缀：-q70.jpg / -q80.webp / -png.png', () => {
    expect(buildOutputFileName('photo.png', SCHEMES[1])).toBe('photo-q70.jpg')
    expect(buildOutputFileName('photo.jpg', SCHEMES[3])).toBe('photo-q80.webp')
    expect(buildOutputFileName('photo.webp', SCHEMES[5])).toBe('photo-png.png')
    expect(buildOutputFileName('photo.png', SCHEMES[0])).toBe('photo-q90.jpg')
    expect(buildOutputFileName('a.bmp', SCHEMES[2])).toBe('a-q50.jpg')
  })

  it('无扩展名与空名兜底', () => {
    expect(buildOutputFileName('noext', SCHEMES[1])).toBe('noext-q70.jpg')
    expect(buildOutputFileName('', SCHEMES[5])).toBe('image-png.png')
    expect(buildOutputFileName('.png', SCHEMES[0])).toBe('image-q90.jpg')
  })
})

describe('compressionRatioText', () => {
  it('正常比例保留 1 位小数', () => {
    expect(compressionRatioText(1000, 250)).toBe('25.0%')
    expect(compressionRatioText(1000, 1000)).toBe('100.0%')
    expect(compressionRatioText(3000, 1000)).toBe('33.3%')
  })

  it('原大小为 0 时返回占位', () => {
    expect(compressionRatioText(0, 100)).toBe('—')
  })
})

describe('bestSchemeId', () => {
  it('空数组返回 null', () => {
    expect(bestSchemeId([])).toBeNull()
  })

  it('返回体积最小的方案 id', () => {
    const sizes = [
      { id: 'jpeg-q90', size: 900 },
      { id: 'jpeg-q50', size: 500 },
      { id: 'png', size: 5000 },
    ]
    expect(bestSchemeId(sizes)).toBe('jpeg-q50')
  })

  it('并列时取首个（稳定）', () => {
    expect(
      bestSchemeId([
        { id: 'a', size: 100 },
        { id: 'b', size: 100 },
      ]),
    ).toBe('a')
  })
})
