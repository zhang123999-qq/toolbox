/**
 * bitmap-font（#796）utils 单测：字体位图。
 */
import { describe, expect, it } from 'vitest'
import { cropBitmap, exportBitmapFont, packRowBits, rasterizeText } from './utils'
import type { RasterCanvasFactory } from './utils'

/** 可控的 mock 工厂：按 create 传入的尺寸生成 alpha 矩阵 */
function mockFactory(alphaAt: (x: number, y: number) => number): RasterCanvasFactory {
  return {
    create: (w, h) => {
      const flat: number[] = []
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          flat.push(0, 0, 0, alphaAt(x, y))
        }
      }
      return {
        ctx: {
          fillStyle: '#000',
          font: '',
          textBaseline: '',
          fillRect() {},
          fillText() {},
          getImageData: () => ({ data: flat, width: w, height: h }),
        },
      }
    },
  }
}

const CROSS: number[][] = [
  [0, 200, 0, 0],
  [200, 200, 200, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
]

function crossFactory(): RasterCanvasFactory {
  return mockFactory((x, y) => CROSS[y]?.[x] ?? 0)
}

function blankFactory(): RasterCanvasFactory {
  return mockFactory(() => 0)
}

function solidFactory(): RasterCanvasFactory {
  return mockFactory(() => 255)
}

describe('rasterizeText', () => {
  it('按 alpha>128 二值化并去重', () => {
    const chars = rasterizeText({ text: 'AA', font: 'monospace', size: 8 }, crossFactory())
    expect(chars).toHaveLength(1)
    expect(chars[0].char).toBe('A')
    // 裁剪后：2 行 × 3 列
    expect(chars[0].h).toBe(2)
    expect(chars[0].w).toBe(3)
    expect(chars[0].bitmap).toEqual([
      [0, 1, 0],
      [1, 1, 1],
    ])
  })
  it('全空白字符得到 0×0', () => {
    const chars = rasterizeText({ text: ' ', font: 'monospace', size: 8 }, blankFactory())
    expect(chars[0].w).toBe(0)
    expect(chars[0].h).toBe(0)
    expect(chars[0].bitmap).toEqual([])
  })
  it('多字符按序返回', () => {
    const chars = rasterizeText({ text: 'AB', font: 'serif', size: 8 }, solidFactory())
    expect(chars.map((c) => c.char)).toEqual(['A', 'B'])
  })
  it('空文本报错', () => {
    expect(() => rasterizeText({ text: '', font: 'monospace', size: 16 }, blankFactory())).toThrow(
      '文本不能为空',
    )
  })
  it('空字体报错', () => {
    expect(() => rasterizeText({ text: 'A', font: '  ', size: 16 }, blankFactory())).toThrow(
      '字体不能为空',
    )
  })
  it('非法字号报错', () => {
    const f = blankFactory()
    expect(() => rasterizeText({ text: 'A', font: 'monospace', size: 7 }, f)).toThrow('字号')
    expect(() => rasterizeText({ text: 'A', font: 'monospace', size: 129 }, f)).toThrow('字号')
    expect(() => rasterizeText({ text: 'A', font: 'monospace', size: 12.5 }, f)).toThrow('字号')
  })
})

describe('cropBitmap', () => {
  it('裁剪四周空白', () => {
    const r = cropBitmap([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ])
    expect(r.w).toBe(1)
    expect(r.h).toBe(1)
    expect(r.bitmap).toEqual([[1]])
  })
  it('全空返回 0×0', () => {
    const r = cropBitmap([
      [0, 0],
      [0, 0],
    ])
    expect(r).toEqual({ w: 0, h: 0, bitmap: [] })
  })
  it('空数组返回 0×0', () => {
    expect(cropBitmap([])).toEqual({ w: 0, h: 0, bitmap: [] })
  })
})

describe('packRowBits', () => {
  it('8 位打包为单字节 MSB 优先', () => {
    expect(packRowBits([1, 0, 1, 0, 1, 0, 1, 0])).toEqual([0xaa])
  })
  it('不足 8 位补低位 0', () => {
    expect(packRowBits([1, 1])).toEqual([0xc0])
  })
  it('多字节', () => {
    expect(packRowBits([1, 1, 1, 1, 1, 1, 1, 1, 1])).toEqual([0xff, 0x80])
  })
  it('空行返回空数组', () => {
    expect(packRowBits([])).toEqual([])
  })
})

describe('exportBitmapFont', () => {
  const chars = [
    { char: 'A', w: 2, h: 1, bitmap: [[1, 0]] },
    { char: 'B', w: 0, h: 0, bitmap: [] },
  ]
  it('JSON 格式', () => {
    const out = exportBitmapFont(chars, 'json')
    const parsed = JSON.parse(out) as Array<{ char: string }>
    expect(parsed).toHaveLength(2)
    expect(parsed[0].char).toBe('A')
  })
  it('C 数组格式', () => {
    const out = exportBitmapFont(chars, 'c')
    expect(out).toContain("/* 'A' 2x1 */")
    expect(out).toContain('const unsigned char FONT_0[1] = {0x80};')
    expect(out).toContain('const unsigned char FONT_1[0] = {};')
  })
  it('未知格式报错', () => {
    expect(() => exportBitmapFont(chars, 'xml' as never)).toThrow('未知导出格式')
  })
})
