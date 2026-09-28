import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLUMNS,
  DEFAULT_GAP,
  DEFAULT_QUALITY,
  MAX_COLUMNS,
  MAX_FILE_SIZE,
  MAX_GAP,
  assertEnoughImages,
  assertFileSizeOk,
  buildOutputFileName,
  computeMergeLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseBgColor,
  parseColumns,
  parseGap,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseColumns', () => {
  it('空串用默认 3', () => {
    expect(parseColumns('')).toBe(DEFAULT_COLUMNS)
    expect(parseColumns('   ')).toBe(DEFAULT_COLUMNS)
  })

  it('正常解析', () => {
    expect(parseColumns('1')).toBe(1)
    expect(parseColumns(String(MAX_COLUMNS))).toBe(MAX_COLUMNS)
    expect(parseColumns(' 5 ')).toBe(5)
  })

  it('非法抛错', () => {
    expect(() => parseColumns('abc')).toThrow(/列数无效/)
    expect(() => parseColumns('2.5')).toThrow(/列数无效/)
    expect(() => parseColumns('0')).toThrow(/超出范围/)
    expect(() => parseColumns(String(MAX_COLUMNS + 1))).toThrow(/超出范围/)
  })
})

describe('parseGap', () => {
  it('空串用默认 0', () => {
    expect(parseGap('')).toBe(DEFAULT_GAP)
  })

  it('正常解析', () => {
    expect(parseGap('0')).toBe(0)
    expect(parseGap(String(MAX_GAP))).toBe(MAX_GAP)
    expect(parseGap(' 10 ')).toBe(10)
  })

  it('非法抛错', () => {
    expect(() => parseGap('abc')).toThrow(/间距无效/)
    expect(() => parseGap('-1')).toThrow(/间距无效/)
    expect(() => parseGap(String(MAX_GAP + 1))).toThrow(/超出范围/)
  })
})

describe('parseQuality', () => {
  it('空串用默认 85', () => {
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

describe('parseBgColor', () => {
  it('合法 #rrggbb 通过', () => {
    expect(parseBgColor('#ffffff')).toBe('#ffffff')
    expect(parseBgColor('#FF00aa')).toBe('#FF00aa')
    expect(parseBgColor('  #123456  ')).toBe('#123456')
  })

  it('非法抛错', () => {
    expect(() => parseBgColor('ffffff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#fff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#gggggg')).toThrow(/背景色无效/)
    expect(() => parseBgColor('')).toThrow(/背景色无效/)
  })
})

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })

  it('PNG 质量不生效', () => {
    expect(effectiveQuality('png', 85)).toBeUndefined()
    expect(effectiveQuality('jpeg', 85)).toBe(0.85)
    expect(effectiveQuality('webp', 100)).toBe(1)
  })
})

describe('buildOutputFileName', () => {
  it('按时间戳与格式构造文件名', () => {
    // 注意：月份是 0 起始，8 = 9 月
    const d = new Date(2026, 8, 28, 12, 5, 7)
    expect(buildOutputFileName(d, 'jpeg')).toBe('merged-20260928-120507.jpg')
    expect(buildOutputFileName(d, 'png')).toBe('merged-20260928-120507.png')
    expect(buildOutputFileName(d, 'webp')).toBe('merged-20260928-120507.webp')
  })

  it('单位数补零', () => {
    const d = new Date(2026, 0, 3, 4, 5, 6)
    expect(buildOutputFileName(d, 'png')).toBe('merged-20260103-040506.png')
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

describe('assertEnoughImages', () => {
  it('2 张及以上不抛错', () => {
    expect(() => assertEnoughImages(2)).not.toThrow()
    expect(() => assertEnoughImages(10)).not.toThrow()
  })

  it('不足 2 张抛错', () => {
    expect(() => assertEnoughImages(1)).toThrow(/至少需要 2 张图片/)
    expect(() => assertEnoughImages(0)).toThrow(/至少需要 2 张图片/)
  })
})

describe('computeMergeLayout', () => {
  const s1 = { w: 100, h: 50 }
  const s2 = { w: 200, h: 80 }

  it('空列表抛错', () => {
    expect(() =>
      computeMergeLayout([], { direction: 'horizontal', columns: 3, gap: 0, align: 'center' }),
    ).toThrow(/图片列表为空/)
  })

  it('非法尺寸抛错', () => {
    const opts = { direction: 'horizontal', columns: 3, gap: 0, align: 'center' } as const
    expect(() => computeMergeLayout([{ w: 0, h: 50 }], opts)).toThrow(/图片尺寸无效/)
    expect(() => computeMergeLayout([{ w: 100, h: -1 }], opts)).toThrow(/图片尺寸无效/)
    expect(() => computeMergeLayout([{ w: NaN, h: 50 }], opts)).toThrow(/图片尺寸无效/)
  })

  it('非法列数/间距抛错', () => {
    expect(() =>
      computeMergeLayout([s1], { direction: 'grid', columns: 0, gap: 0, align: 'center' }),
    ).toThrow(/列数无效/)
    expect(() =>
      computeMergeLayout([s1], { direction: 'grid', columns: 1.5, gap: 0, align: 'center' }),
    ).toThrow(/列数无效/)
    expect(() =>
      computeMergeLayout([s1], { direction: 'horizontal', columns: 3, gap: -1, align: 'center' }),
    ).toThrow(/间距无效/)
    expect(() =>
      computeMergeLayout([s1], { direction: 'horizontal', columns: 3, gap: NaN, align: 'center' }),
    ).toThrow(/间距无效/)
  })

  it('横向：总宽累加、总高取最大，y 按垂直对齐', () => {
    const base = { direction: 'horizontal', columns: 3, gap: 10, align: 'center' } as const
    const r = computeMergeLayout([s1, s2], base)
    expect(r.width).toBe(310)
    expect(r.height).toBe(80)
    // center：(80-50)/2=15，(80-80)/2=0
    expect(r.placements).toEqual([
      { x: 0, y: 15, w: 100, h: 50 },
      { x: 110, y: 0, w: 200, h: 80 },
    ])

    const top = computeMergeLayout([s1, s2], { ...base, align: 'top' })
    expect(top.placements.map((p) => p.y)).toEqual([0, 0])

    const bottom = computeMergeLayout([s1, s2], { ...base, align: 'bottom' })
    expect(bottom.placements.map((p) => p.y)).toEqual([30, 0])

    // 横向时 left/right 无意义，按 center 处理
    const fallback = computeMergeLayout([s1, s2], { ...base, align: 'left' })
    expect(fallback.placements.map((p) => p.y)).toEqual([15, 0])
  })

  it('纵向：总高累加、总宽取最大，x 按水平对齐', () => {
    const base = { direction: 'vertical', columns: 3, gap: 10, align: 'right' } as const
    const r = computeMergeLayout([s1, s2], base)
    expect(r.width).toBe(200)
    expect(r.height).toBe(140)
    expect(r.placements).toEqual([
      { x: 100, y: 0, w: 100, h: 50 },
      { x: 0, y: 60, w: 200, h: 80 },
    ])

    const left = computeMergeLayout([s1, s2], { ...base, align: 'left' })
    expect(left.placements.map((p) => p.x)).toEqual([0, 0])

    const center = computeMergeLayout([s1, s2], { ...base, align: 'center' })
    expect(center.placements.map((p) => p.x)).toEqual([50, 0])

    // 纵向时 top/bottom 无意义，按 center 处理
    const fallback = computeMergeLayout([s1, s2], { ...base, align: 'top' })
    expect(fallback.placements.map((p) => p.x)).toEqual([50, 0])
  })

  it('网格：列宽取列最大、行高取行最大', () => {
    const sizes = [s1, s2, { w: 50, h: 60 }]
    const r = computeMergeLayout(sizes, { direction: 'grid', columns: 2, gap: 10, align: 'center' })
    // 列宽 [max(100,50), 200] = [100,200]，行高 [80, 60]
    expect(r.width).toBe(310)
    expect(r.height).toBe(150)
    expect(r.placements).toEqual([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 110, y: 0, w: 200, h: 80 },
      { x: 0, y: 90, w: 50, h: 60 },
    ])
  })

  it('网格列数大于图片数时只用有效列', () => {
    const r = computeMergeLayout([s1, s2], { direction: 'grid', columns: 5, gap: 0, align: 'top' })
    expect(r.width).toBe(300)
    expect(r.height).toBe(80)
    expect(r.placements).toEqual([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 100, y: 0, w: 200, h: 80 },
    ])
  })

  it('单张图也能算出布局', () => {
    const r = computeMergeLayout([s1], {
      direction: 'horizontal',
      columns: 3,
      gap: 10,
      align: 'top',
    })
    expect(r).toEqual({ width: 100, height: 50, placements: [{ x: 0, y: 0, w: 100, h: 50 }] })
  })
})
