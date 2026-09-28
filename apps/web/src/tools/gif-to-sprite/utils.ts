/**
 * gif-to-sprite —— 全局编号 #798
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：C（WebCodecs）｜模板：T3
 *
 * GIF 转精灵图：
 * decodeGifFrames 用 WebCodecs ImageDecoder 逐帧解码 GIF（decoderFactory /
 * toBitmap 均可注入，测试全 mock；无 ImageDecoder 时中文提示浏览器支持情况）；
 * layoutSpriteSheet 纯函数计算雪碧图网格布局（最大帧尺寸为单元格）；
 * sheetPngData 通过可注入的画布工厂把帧拼成雪碧图并导出 PNG dataURL。
 * 空文件/零帧/非法列数中文报错。无任何运行时依赖。
 */

/** 与 WebCodecs 解耦的最小视频帧接口 */
export interface VideoFrameLike {
  displayWidth: number
  displayHeight: number
  /** 时长（微秒），可能缺失 */
  duration?: number
  close(): void
}

/** 与 WebCodecs 解耦的最小解码器接口 */
export interface ImageDecoderLike {
  readonly complete: Promise<void>
  readonly tracks: { readonly selectedTrack?: { readonly frameCount: number } | null }
  decode(opts: { frameIndex: number }): Promise<{ image: VideoFrameLike }>
  close(): void
}

export type ImageDecoderFactory = (init: { data: ArrayBuffer; type: string }) => ImageDecoderLike
export type BitmapConverter = (frame: VideoFrameLike) => Promise<unknown>

export interface DecodedGifFrame {
  /** 位图对象（浏览器中为 ImageBitmap，测试中为 mock） */
  bitmap: unknown
  width: number
  height: number
  /** 单帧时长毫秒 */
  durationMs: number
}

export interface SheetCell {
  index: number
  x: number
  y: number
  w: number
  h: number
}

export interface SheetLayout {
  cols: number
  rows: number
  cellW: number
  cellH: number
  sheetW: number
  sheetH: number
  cells: SheetCell[]
}

/** 与 DOM 解耦的最小拼图上下文接口 */
export interface SheetDrawContext {
  drawImage(bitmap: unknown, x: number, y: number, w: number, h: number): void
}

export interface SheetCanvasFactory {
  create(w: number, h: number): { ctx: SheetDrawContext; toDataURL(): string }
}

function defaultDecoderFactory(): ImageDecoderFactory | null {
  const Ctor = (globalThis as Record<string, unknown>).ImageDecoder
  if (typeof Ctor !== 'function') return null
  return (init) =>
    new (Ctor as new (i: { data: ArrayBuffer; type: string }) => ImageDecoderLike)(init)
}

function defaultBitmapConverter(): BitmapConverter | null {
  const fn = (globalThis as Record<string, unknown>).createImageBitmap
  if (typeof fn !== 'function') return null
  return (frame) => (fn as (f: VideoFrameLike) => Promise<unknown>)(frame)
}

/**
 * 解码 GIF 每一帧。decoderFactory / toBitmap 可注入 mock；
 * 默认使用全局 ImageDecoder / createImageBitmap。
 */
export async function decodeGifFrames(
  buffer: ArrayBuffer,
  opts?: { decoderFactory?: ImageDecoderFactory; toBitmap?: BitmapConverter },
): Promise<DecodedGifFrame[]> {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    throw new Error('GIF 文件内容为空')
  }
  const factory = opts?.decoderFactory ?? defaultDecoderFactory()
  if (!factory) {
    throw new Error(
      '当前浏览器不支持 WebCodecs ImageDecoder（需要 Chrome/Edge 94+、Safari 18.4+ 或 Firefox 130+）',
    )
  }
  const toBitmap = opts?.toBitmap ?? defaultBitmapConverter()
  if (!toBitmap) throw new Error('当前浏览器不支持 createImageBitmap')
  const decoder = factory({ data: buffer, type: 'image/gif' })
  try {
    await decoder.complete
    const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 0
    if (frameCount <= 0) throw new Error('未从 GIF 中解析到任何帧')
    const frames: DecodedGifFrame[] = []
    for (let i = 0; i < frameCount; i += 1) {
      const { image } = await decoder.decode({ frameIndex: i })
      try {
        const durationMs =
          typeof image.duration === 'number' && image.duration > 0
            ? Math.round(image.duration / 1000)
            : 100
        const bitmap = await toBitmap(image)
        frames.push({ bitmap, width: image.displayWidth, height: image.displayHeight, durationMs })
      } finally {
        image.close()
      }
    }
    return frames
  } finally {
    decoder.close()
  }
}

/**
 * 计算雪碧图网格布局：单元格取所有帧的最大宽高，
 * 每帧左上角对齐放入对应格子。
 */
export function layoutSpriteSheet(
  frameSizes: Array<{ width: number; height: number }>,
  cols: number,
): SheetLayout {
  if (frameSizes.length === 0) throw new Error('没有帧可布局')
  if (!Number.isInteger(cols) || cols < 1 || cols > 64) {
    throw new Error('列数须为 1~64 的正整数')
  }
  const cellW = Math.max(...frameSizes.map((f) => f.width))
  const cellH = Math.max(...frameSizes.map((f) => f.height))
  if (cellW <= 0 || cellH <= 0) throw new Error('帧尺寸非法')
  const rows = Math.ceil(frameSizes.length / cols)
  const cells: SheetCell[] = frameSizes.map((f, i) => ({
    index: i,
    x: (i % cols) * cellW,
    y: Math.floor(i / cols) * cellH,
    w: f.width,
    h: f.height,
  }))
  return { cols, rows, cellW, cellH, sheetW: cols * cellW, sheetH: rows * cellH, cells }
}

/** 按布局把帧拼成雪碧图，导出 PNG dataURL（画布工厂可注入） */
export function sheetPngData(
  frames: DecodedGifFrame[],
  layout: SheetLayout,
  factory: SheetCanvasFactory,
): string {
  if (frames.length === 0) throw new Error('没有帧可拼接')
  const { ctx, toDataURL } = factory.create(layout.sheetW, layout.sheetH)
  layout.cells.forEach((cell, i) => {
    const f = frames[i]
    if (f) ctx.drawImage(f.bitmap, cell.x, cell.y, cell.w, cell.h)
  })
  return toDataURL()
}
