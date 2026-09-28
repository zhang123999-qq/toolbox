/**
 * gif-to-sprite（#798）utils 单测：GIF 转精灵图（ImageDecoder 全 mock）。
 */
import { describe, expect, it, vi } from 'vitest'
import { decodeGifFrames, layoutSpriteSheet, sheetPngData } from './utils'
import type { DecodedGifFrame, ImageDecoderLike, VideoFrameLike } from './utils'

function mockFrame(w: number, h: number, duration?: number): VideoFrameLike {
  return { displayWidth: w, displayHeight: h, duration, close: vi.fn() }
}

function mockDecoder(frames: VideoFrameLike[]): ImageDecoderLike & { closed: boolean } {
  const d = {
    closed: false,
    complete: Promise.resolve(),
    tracks: { selectedTrack: { frameCount: frames.length } },
    decode: async ({ frameIndex }: { frameIndex: number }) => ({ image: frames[frameIndex] }),
    close() {
      d.closed = true
    },
  }
  return d
}

describe('decodeGifFrames', () => {
  it('逐帧解码并转换时长', async () => {
    const frames = [mockFrame(10, 20, 50000), mockFrame(10, 20)]
    const decoder = mockDecoder(frames)
    const bitmaps: unknown[] = []
    const out = await decodeGifFrames(new ArrayBuffer(8), {
      decoderFactory: () => decoder,
      toBitmap: async (f) => {
        const b = { tag: 'bitmap', w: f.displayWidth }
        bitmaps.push(b)
        return b
      },
    })
    expect(out).toHaveLength(2)
    expect(out[0].durationMs).toBe(50)
    expect(out[1].durationMs).toBe(100)
    expect(out[0].width).toBe(10)
    expect(out[0].height).toBe(20)
    expect(bitmaps).toHaveLength(2)
    expect(frames[0].close).toHaveBeenCalledTimes(1)
    expect(frames[1].close).toHaveBeenCalledTimes(1)
    expect(decoder.closed).toBe(true)
  })
  it('默认使用全局 ImageDecoder 与 createImageBitmap', async () => {
    const g = globalThis as Record<string, unknown>
    const savedD = g.ImageDecoder
    const savedB = g.createImageBitmap
    const frames = [mockFrame(8, 8, 100000)]
    let capturedInit: unknown = null
    g.ImageDecoder = class {
      complete = Promise.resolve()
      tracks = { selectedTrack: { frameCount: 1 } }
      constructor(init: unknown) {
        capturedInit = init
      }
      async decode() {
        return { image: frames[0] }
      }
      close() {}
    }
    g.createImageBitmap = async (f: VideoFrameLike) => ({ from: f.displayWidth })
    try {
      const out = await decodeGifFrames(new ArrayBuffer(8))
      expect(out).toHaveLength(1)
      expect(out[0].durationMs).toBe(100)
      expect(out[0].bitmap).toEqual({ from: 8 })
      expect((capturedInit as { type: string }).type).toBe('image/gif')
    } finally {
      if (savedD !== undefined) g.ImageDecoder = savedD
      else delete g.ImageDecoder
      if (savedB !== undefined) g.createImageBitmap = savedB
      else delete g.createImageBitmap
    }
  })
  it('空 buffer 报错', async () => {
    await expect(decodeGifFrames(new ArrayBuffer(0))).rejects.toThrow('内容为空')
  })
  it('非 ArrayBuffer 报错', async () => {
    await expect(decodeGifFrames('x' as never)).rejects.toThrow('内容为空')
  })
  it('selectedTrack 缺失时视为零帧报错', async () => {
    const decoder = {
      complete: Promise.resolve(),
      tracks: { selectedTrack: null },
      decode: async () => ({ image: mockFrame(1, 1) }),
      close: () => {},
    }
    await expect(
      decodeGifFrames(new ArrayBuffer(4), { decoderFactory: () => decoder, toBitmap: async () => ({}) }),
    ).rejects.toThrow('未从 GIF 中解析到任何帧')
  })
  it('零帧报错', async () => {
    const decoder = mockDecoder([])
    await expect(
      decodeGifFrames(new ArrayBuffer(4), { decoderFactory: () => decoder, toBitmap: async () => ({}) }),
    ).rejects.toThrow('未从 GIF 中解析到任何帧')
  })
  it('无 ImageDecoder 时中文提示', async () => {
    const g = globalThis as Record<string, unknown>
    const saved = g.ImageDecoder
    delete g.ImageDecoder
    try {
      await expect(decodeGifFrames(new ArrayBuffer(4))).rejects.toThrow('ImageDecoder')
    } finally {
      if (saved !== undefined) g.ImageDecoder = saved
    }
  })
  it('有 ImageDecoder 但无 createImageBitmap 时报错', async () => {
    const g = globalThis as Record<string, unknown>
    const savedD = g.ImageDecoder
    const savedB = g.createImageBitmap
    g.ImageDecoder = class {
      complete = Promise.resolve()
      tracks = { selectedTrack: { frameCount: 1 } }
      async decode() {
        return { image: mockFrame(1, 1) }
      }
      close() {}
    }
    delete g.createImageBitmap
    try {
      await expect(decodeGifFrames(new ArrayBuffer(4))).rejects.toThrow('createImageBitmap')
    } finally {
      if (savedD !== undefined) g.ImageDecoder = savedD
      else delete g.ImageDecoder
      if (savedB !== undefined) g.createImageBitmap = savedB
    }
  })
})

describe('layoutSpriteSheet', () => {
  const sizes = [
    { width: 10, height: 20 },
    { width: 30, height: 10 },
    { width: 20, height: 20 },
  ]
  it('网格布局计算', () => {
    const l = layoutSpriteSheet(sizes, 2)
    expect(l.cols).toBe(2)
    expect(l.rows).toBe(2)
    expect(l.cellW).toBe(30)
    expect(l.cellH).toBe(20)
    expect(l.sheetW).toBe(60)
    expect(l.sheetH).toBe(40)
    expect(l.cells[0]).toEqual({ index: 0, x: 0, y: 0, w: 10, h: 20 })
    expect(l.cells[1]).toEqual({ index: 1, x: 30, y: 0, w: 30, h: 10 })
    expect(l.cells[2]).toEqual({ index: 2, x: 0, y: 20, w: 20, h: 20 })
  })
  it('单列', () => {
    const l = layoutSpriteSheet(sizes, 1)
    expect(l.rows).toBe(3)
    expect(l.sheetW).toBe(30)
  })
  it('布局格子多于帧时跳过缺失帧', () => {
    const frames: DecodedGifFrame[] = [{ bitmap: { id: 1 }, width: 10, height: 10, durationMs: 100 }]
    const layout = layoutSpriteSheet(
      [
        { width: 10, height: 10 },
        { width: 10, height: 10 },
      ],
      2,
    )
    const draws: unknown[] = []
    const url = sheetPngData(frames, layout, {
      create: () => ({
        ctx: {
          drawImage: (b: unknown) => {
            draws.push(b)
          },
        },
        toDataURL: () => 'data:image/png;base64,PARTIAL',
      }),
    })
    expect(url).toBe('data:image/png;base64,PARTIAL')
    expect(draws).toHaveLength(1)
  })
  it('空帧报错', () => {
    expect(() => layoutSpriteSheet([], 2)).toThrow('没有帧可布局')
  })
  it('非法列数报错', () => {
    expect(() => layoutSpriteSheet(sizes, 0)).toThrow('列数')
    expect(() => layoutSpriteSheet(sizes, 65)).toThrow('列数')
    expect(() => layoutSpriteSheet(sizes, 1.5)).toThrow('列数')
  })
  it('非法帧尺寸报错', () => {
    expect(() => layoutSpriteSheet([{ width: 0, height: 10 }], 1)).toThrow('帧尺寸非法')
  })
})

describe('sheetPngData', () => {
  it('按布局绘制并返回 dataURL', () => {
    const frames: DecodedGifFrame[] = [
      { bitmap: { id: 1 }, width: 10, height: 10, durationMs: 100 },
      { bitmap: { id: 2 }, width: 10, height: 10, durationMs: 100 },
    ]
    const layout = layoutSpriteSheet(
      frames.map((f) => ({ width: f.width, height: f.height })),
      2,
    )
    const draws: Array<{ b: unknown; x: number; y: number; w: number; h: number }> = []
    const url = sheetPngData(frames, layout, {
      create: (w, h) => {
        expect(w).toBe(20)
        expect(h).toBe(10)
        return {
          ctx: {
            drawImage: (b, x, y, ww, hh) => {
              draws.push({ b, x, y, w: ww, h: hh })
            },
          },
          toDataURL: () => 'data:image/png;base64,SHEET',
        }
      },
    })
    expect(url).toBe('data:image/png;base64,SHEET')
    expect(draws).toHaveLength(2)
    expect(draws[0]).toEqual({ b: { id: 1 }, x: 0, y: 0, w: 10, h: 10 })
    expect(draws[1]).toEqual({ b: { id: 2 }, x: 10, y: 0, w: 10, h: 10 })
  })
  it('空帧报错', () => {
    const layout = layoutSpriteSheet([{ width: 1, height: 1 }], 1)
    expect(() =>
      sheetPngData([], layout, { create: () => ({ ctx: { drawImage() {} }, toDataURL: () => '' }) }),
    ).toThrow('没有帧可拼接')
  })
})
