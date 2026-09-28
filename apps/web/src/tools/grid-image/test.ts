import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GRID_COUNT,
  DEFAULT_QUALITY,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildTileFileName,
  computeTiles,
  errorMessage,
  formatToMime,
  parseCols,
  parseQuality,
  parseRows,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseRows', () => {
  it('空串用默认 3', () => {
    expect(parseRows('')).toBe(DEFAULT_GRID_COUNT)
    expect(parseRows('   ')).toBe(DEFAULT_GRID_COUNT)
  })

  it('正常解析（边界 1 与 10）', () => {
    expect(parseRows('1')).toBe(1)
    expect(parseRows('10')).toBe(10)
    expect(parseRows(' 5 ')).toBe(5)
  })

  it('非法抛错', () => {
    expect(() => parseRows('abc')).toThrow(/行数无效/)
    expect(() => parseRows('3.5')).toThrow(/行数无效/)
    expect(() => parseRows('0')).toThrow(/行数超出范围/)
    expect(() => parseRows('11')).toThrow(/行数超出范围/)
  })
})

describe('parseCols', () => {
  it('空串用默认 3', () => {
    expect(parseCols('')).toBe(DEFAULT_GRID_COUNT)
  })

  it('正常解析（边界 1 与 10）', () => {
    expect(parseCols('1')).toBe(1)
    expect(parseCols('10')).toBe(10)
  })

  it('非法抛错', () => {
    expect(() => parseCols('x')).toThrow(/列数无效/)
    expect(() => parseCols('0')).toThrow(/列数超出范围/)
    expect(() => parseCols('99')).toThrow(/列数超出范围/)
  })
})

describe('parseQuality', () => {
  it('空串用默认 90', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
    expect(parseQuality(' 90 ')).toBe(90)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('90.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/质量超出范围/)
    expect(() => parseQuality('101')).toThrow(/质量超出范围/)
  })
})

describe('computeTiles', () => {
  it('整除时均分（900×900 切 3×3）', () => {
    const tiles = computeTiles(900, 900, 3, 3)
    expect(tiles).toHaveLength(9)
    expect(tiles[0]).toEqual({ x: 0, y: 0, w: 300, h: 300 })
    expect(tiles[4]).toEqual({ x: 300, y: 300, w: 300, h: 300 })
    expect(tiles[8]).toEqual({ x: 600, y: 600, w: 300, h: 300 })
    const area = tiles.reduce((s, t) => s + t.w * t.h, 0)
    expect(area).toBe(900 * 900)
  })

  it('余数由最后一行/列吸收（100×100 切 3×3）', () => {
    const tiles = computeTiles(100, 100, 3, 3)
    expect(tiles).toHaveLength(9)
    // 基础块 33×33，最后一列 x=66 宽 34，最后一行 y=66 高 34
    expect(tiles[2]).toEqual({ x: 66, y: 0, w: 34, h: 33 })
    expect(tiles[6]).toEqual({ x: 0, y: 66, w: 33, h: 34 })
    expect(tiles[8]).toEqual({ x: 66, y: 66, w: 34, h: 34 })
    // 无缝覆盖：面积和等于全图
    const area = tiles.reduce((s, t) => s + t.w * t.h, 0)
    expect(area).toBe(100 * 100)
  })

  it('余数吸收的通用断言：多种尺寸面积和恒等于全图', () => {
    const cases: Array<[number, number, number, number]> = [
      [101, 77, 4, 7],
      [1000, 100, 10, 10],
      [7, 5, 1, 1],
      [1920, 1080, 3, 5],
      [13, 29, 10, 2],
    ]
    for (const [w, h, rows, cols] of cases) {
      const tiles = computeTiles(w, h, rows, cols)
      expect(tiles).toHaveLength(rows * cols)
      // 行优先：第一块在左上，最后一块贴住右下角
      expect(tiles[0].x).toBe(0)
      expect(tiles[0].y).toBe(0)
      const last = tiles[tiles.length - 1]
      expect(last.x + last.w).toBe(w)
      expect(last.y + last.h).toBe(h)
      const area = tiles.reduce((s, t) => s + t.w * t.h, 0)
      expect(area).toBe(w * h)
    }
  })

  it('边界：1×1 不切分，10×10 最大网格', () => {
    expect(computeTiles(80, 60, 1, 1)).toEqual([{ x: 0, y: 0, w: 80, h: 60 }])
    const tiles = computeTiles(100, 100, 10, 10)
    expect(tiles).toHaveLength(100)
    const area = tiles.reduce((s, t) => s + t.w * t.h, 0)
    expect(area).toBe(10000)
  })

  it('图片尺寸非法抛错', () => {
    expect(() => computeTiles(0, 100, 3, 3)).toThrow(/图片尺寸无效/)
    expect(() => computeTiles(100, -5, 3, 3)).toThrow(/图片尺寸无效/)
    expect(() => computeTiles(NaN, 100, 3, 3)).toThrow(/图片尺寸无效/)
    expect(() => computeTiles(100, NaN, 3, 3)).toThrow(/图片尺寸无效/)
  })

  it('行列数非法抛错', () => {
    expect(() => computeTiles(100, 100, 0, 3)).toThrow(/行列数无效/)
    expect(() => computeTiles(100, 100, 3, -2)).toThrow(/行列数无效/)
    expect(() => computeTiles(100, 100, 2.5, 3)).toThrow(/行列数无效/)
    expect(() => computeTiles(100, 100, 3, 1.5)).toThrow(/行列数无效/)
  })

  it('网格超过图片尺寸抛错（块宽/块高不足 1px）', () => {
    expect(() => computeTiles(5, 100, 1, 10)).toThrow(/网格过大/)
    expect(() => computeTiles(100, 5, 10, 1)).toThrow(/网格过大/)
  })
})

describe('formatToMime', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })
})

describe('buildTileFileName', () => {
  it('行列从 1 起，扩展名随格式', () => {
    expect(buildTileFileName('photo.png', 1, 1, 'jpeg')).toBe('photo-r1c1.jpg')
    expect(buildTileFileName('a.webp', 3, 2, 'png')).toBe('a-r3c2.png')
    expect(buildTileFileName('pic.jpg', 10, 10, 'webp')).toBe('pic-r10c10.webp')
  })

  it('无扩展名保留原名', () => {
    expect(buildTileFileName('noext', 2, 3, 'webp')).toBe('noext-r2c3.webp')
  })

  it('只去掉最后一个扩展名，空名兜底为 image', () => {
    expect(buildTileFileName('my.photo.jpeg', 1, 1, 'jpeg')).toBe('my.photo-r1c1.jpg')
    expect(buildTileFileName('', 1, 1, 'jpeg')).toBe('image-r1c1.jpg')
    expect(buildTileFileName('.png', 1, 1, 'png')).toBe('image-r1c1.png')
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
