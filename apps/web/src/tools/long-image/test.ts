import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAP,
  DEFAULT_QUALITY,
  GAP_LIMIT,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  computeLongLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  moveItem,
  parseBgColor,
  parseGap,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('parseGap', () => {
  it('空串用默认 0', () => {
    expect(parseGap('')).toBe(DEFAULT_GAP)
    expect(parseGap('   ')).toBe(DEFAULT_GAP)
  })

  it('正常解析', () => {
    expect(parseGap('0')).toBe(0)
    expect(parseGap('200')).toBe(GAP_LIMIT)
    expect(parseGap(' 42 ')).toBe(42)
  })

  it('非法抛错', () => {
    expect(() => parseGap('abc')).toThrow(/间距无效/)
    expect(() => parseGap('12.5')).toThrow(/间距无效/)
    expect(() => parseGap('-5')).toThrow(/间距无效/)
    expect(() => parseGap('201')).toThrow(/间距超出范围/)
    expect(() => parseGap('99999999999999999999')).toThrow(/间距超出范围/)
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
    expect(() => parseQuality('0')).toThrow(/质量超出范围/)
    expect(() => parseQuality('101')).toThrow(/质量超出范围/)
  })
})

describe('parseBgColor', () => {
  it('空串用默认白色', () => {
    expect(parseBgColor('')).toBe('#ffffff')
    expect(parseBgColor('  ')).toBe('#ffffff')
  })

  it('正常解析并统一小写', () => {
    expect(parseBgColor('#ff0000')).toBe('#ff0000')
    expect(parseBgColor('#FFFFFF')).toBe('#ffffff')
    expect(parseBgColor(' #AbCdEf ')).toBe('#abcdef')
  })

  it('非法抛错', () => {
    expect(() => parseBgColor('red')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#fff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#fffff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#gggggg')).toThrow(/背景色无效/)
    expect(() => parseBgColor('ffffff')).toThrow(/背景色无效/)
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(0)).not.toThrow()
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
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
    expect(effectiveQuality('jpeg', 1)).toBe(0.01)
  })
})

describe('computeLongLayout', () => {
  it('uniform：以最宽图为准等比缩放', () => {
    // 100x200 与 200x100，gap 10 → 宽 200；第一张高 400，第二张高 100
    const layout = computeLongLayout(
      [
        { w: 100, h: 200 },
        { w: 200, h: 100 },
      ],
      { widthMode: 'uniform', gap: 10, align: 'center' },
    )
    expect(layout.width).toBe(200)
    expect(layout.placements).toEqual([
      { x: 0, y: 0, w: 200, h: 400 },
      { x: 0, y: 410, w: 200, h: 100 },
    ])
    expect(layout.height).toBe(510)
  })

  it('uniform：单张时不加间距', () => {
    const layout = computeLongLayout([{ w: 300, h: 150 }], {
      widthMode: 'uniform',
      gap: 20,
      align: 'left',
    })
    expect(layout).toEqual({
      width: 300,
      height: 150,
      placements: [{ x: 0, y: 0, w: 300, h: 150 }],
    })
  })

  it('uniform：间距只出现在图之间（n-1 个）', () => {
    const layout = computeLongLayout(
      [
        { w: 10, h: 10 },
        { w: 10, h: 10 },
        { w: 10, h: 10 },
      ],
      { widthMode: 'uniform', gap: 7, align: 'left' },
    )
    expect(layout.height).toBe(44) // 10+7+10+7+10
    expect(layout.placements.map((p) => p.y)).toEqual([0, 17, 34])
  })

  it('original：保持原尺寸，左对齐', () => {
    const layout = computeLongLayout(
      [
        { w: 100, h: 50 },
        { w: 60, h: 40 },
      ],
      { widthMode: 'original', gap: 5, align: 'left' },
    )
    expect(layout.width).toBe(100)
    expect(layout.placements).toEqual([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 0, y: 55, w: 60, h: 40 },
    ])
    expect(layout.height).toBe(95)
  })

  it('original：居中对齐', () => {
    const layout = computeLongLayout(
      [
        { w: 100, h: 50 },
        { w: 60, h: 40 },
      ],
      { widthMode: 'original', gap: 0, align: 'center' },
    )
    expect(layout.placements[1]).toEqual({ x: 20, y: 50, w: 60, h: 40 })
    expect(layout.height).toBe(90)
  })

  it('original：右对齐', () => {
    const layout = computeLongLayout(
      [
        { w: 100, h: 50 },
        { w: 60, h: 40 },
      ],
      { widthMode: 'original', gap: 0, align: 'right' },
    )
    expect(layout.placements[1]).toEqual({ x: 40, y: 50, w: 60, h: 40 })
  })

  it('original：等宽时偏移为 0', () => {
    const layout = computeLongLayout(
      [
        { w: 100, h: 50 },
        { w: 100, h: 80 },
      ],
      { widthMode: 'original', gap: 5, align: 'right' },
    )
    expect(layout.placements.map((p) => p.x)).toEqual([0, 0])
    expect(layout.height).toBe(135)
  })

  it('空数组抛错', () => {
    expect(() => computeLongLayout([], { widthMode: 'uniform', gap: 0, align: 'center' })).toThrow(
      /至少需要/,
    )
  })

  it('非法尺寸抛错', () => {
    const opts = { widthMode: 'uniform', gap: 0, align: 'center' } as const
    expect(() => computeLongLayout([{ w: 0, h: 10 }], opts)).toThrow(/尺寸无效/)
    expect(() => computeLongLayout([{ w: 10, h: -5 }], opts)).toThrow(/尺寸无效/)
    expect(() => computeLongLayout([{ w: NaN, h: 10 }], opts)).toThrow(/尺寸无效/)
    expect(() => computeLongLayout([{ w: Infinity, h: 10 }], opts)).toThrow(/尺寸无效/)
    expect(() =>
      computeLongLayout(
        [
          { w: 10, h: 10 },
          { w: 10, h: 0 },
        ],
        opts,
      ),
    ).toThrow(/尺寸无效/)
  })
})

describe('moveItem', () => {
  it('上移/下移交换相邻元素', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('不修改原数组', () => {
    const arr = ['a', 'b', 'c']
    const next = moveItem(arr, 0, 1)
    expect(arr).toEqual(['a', 'b', 'c'])
    expect(next).toEqual(['b', 'a', 'c'])
    expect(next).not.toBe(arr)
  })

  it('边界移动原样返回（新数组）', () => {
    const arr = ['a', 'b', 'c']
    expect(moveItem(arr, 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(arr, 0, -1)).not.toBe(arr)
    expect(moveItem(arr, 2, 1)).toEqual(['a', 'b', 'c'])
  })

  it('索引越界原样返回', () => {
    expect(moveItem(['a', 'b'], -1, 1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 5, -1)).toEqual(['a', 'b'])
    expect(moveItem([], 0, 1)).toEqual([])
  })
})

describe('buildOutputFileName', () => {
  it('按格式生成时间戳文件名', () => {
    const now = new Date(2026, 8, 28, 12, 58, 47)
    expect(buildOutputFileName('jpeg', now)).toBe('long-image-20260928-125847.jpg')
    expect(buildOutputFileName('png', now)).toBe('long-image-20260928-125847.png')
    expect(buildOutputFileName('webp', now)).toBe('long-image-20260928-125847.webp')
  })

  it('时间部分补零', () => {
    const now = new Date(2026, 0, 5, 3, 4, 5)
    expect(buildOutputFileName('jpeg', now)).toBe('long-image-20260105-030405.jpg')
  })
})
