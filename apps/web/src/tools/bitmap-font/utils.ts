/**
 * bitmap-font —— 全局编号 #796
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 字体位图：
 * rasterizeText 用可注入的画布工厂把文本逐字渲染为位图（canvas 与 DOM 解耦，
 * 测试全 mock）；cropBitmap 裁剪空白边；exportBitmapFont 导出 JSON 或 C 数组
 * 两种格式（行位图按 MSB 优先打包为字节）。
 * 空文本/非法字号中文报错。无任何运行时依赖。
 */

export interface RasterizeOptions {
  /** 要渲染的文本（不能为空） */
  text: string
  /** CSS font-family，如 'monospace' */
  font: string
  /** 字号 px，8~128 */
  size: number
}

/** 与 DOM 解耦的最小光栅化上下文接口 */
export interface RasterContext {
  fillStyle: string
  fillRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number): void
  getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number>; width: number; height: number }
  font: string
  textBaseline: string
}

export interface RasterCanvasFactory {
  create(w: number, h: number): { ctx: RasterContext }
}

export interface BitmapChar {
  char: string
  /** 裁剪后的宽度/高度（px） */
  w: number
  h: number
  /** bitmap[y][x] ∈ {0,1} */
  bitmap: number[][]
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

function validateOptions(opts: RasterizeOptions): void {
  if (typeof opts.text !== 'string' || opts.text.length === 0) throw new Error('文本不能为空')
  if (typeof opts.font !== 'string' || opts.font.trim() === '') throw new Error('字体不能为空')
  if (!isPositiveInt(opts.size) || opts.size < 8 || opts.size > 128) {
    throw new Error('字号须为 8~128 的正整数')
  }
}

/** 裁剪位图四周全 0 的空白行/列；全空返回 0×0 */
export function cropBitmap(bitmap: number[][]): { w: number; h: number; bitmap: number[][] } {
  const h = bitmap.length
  const w = h > 0 ? bitmap[0].length : 0
  let top = h
  let bottom = -1
  let left = w
  let right = -1
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (bitmap[y][x] === 1) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }
  if (bottom === -1) return { w: 0, h: 0, bitmap: [] }
  const out: number[][] = []
  for (let y = top; y <= bottom; y += 1) out.push(bitmap[y].slice(left, right + 1))
  return { w: right - left + 1, h: bottom - top + 1, bitmap: out }
}

/**
 * 逐字光栅化。每个字符占用 size×size 单元格，绘制后按 alpha>128 二值化并裁剪。
 * factory 可注入 mock；默认逻辑不触碰真实 DOM。
 */
export function rasterizeText(opts: RasterizeOptions, factory: RasterCanvasFactory): BitmapChar[] {
  validateOptions(opts)
  const { text, font, size } = opts
  const chars: BitmapChar[] = []
  const seen = new Set<string>()
  for (const ch of text) {
    if (seen.has(ch)) continue
    seen.add(ch)
    const { ctx } = factory.create(size, size)
    ctx.font = `${size}px ${font}`
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(ch, 0, 0)
    const img = ctx.getImageData(0, 0, size, size)
    const full: number[][] = []
    for (let y = 0; y < size; y += 1) {
      const row: number[] = []
      for (let x = 0; x < size; x += 1) {
        const a = img.data[(y * size + x) * 4 + 3]
        row.push(a > 128 ? 1 : 0)
      }
      full.push(row)
    }
    const cropped = cropBitmap(full)
    chars.push({ char: ch, w: cropped.w, h: cropped.h, bitmap: cropped.bitmap })
  }
  return chars
}

/** 把一行位图按 MSB 优先打包为字节数组 */
export function packRowBits(row: number[]): number[] {
  const bytes: number[] = []
  for (let i = 0; i < row.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8 && i + j < row.length; j += 1) {
      if (row[i + j] === 1) b |= 1 << (7 - j)
    }
    bytes.push(b)
  }
  return bytes
}

function toHex(n: number): string {
  return '0x' + n.toString(16).toUpperCase().padStart(2, '0')
}

/**
 * 导出位图字体。format='json' 输出 JSON；format='c' 输出 C 语言数组
 * （每行位图 MSB 优先打包为字节，附字符注释）。
 */
export function exportBitmapFont(chars: BitmapChar[], format: 'json' | 'c'): string {
  if (format !== 'json' && format !== 'c') throw new Error(`未知导出格式：${String(format)}`)
  if (format === 'json') {
    return JSON.stringify(
      chars.map((c) => ({ char: c.char, w: c.w, h: c.h, bitmap: c.bitmap })),
      null,
      2,
    )
  }
  const lines: string[] = []
  lines.push(`/* bitmap font: ${chars.length} chars */`)
  chars.forEach((c, idx) => {
    const bytes: number[] = []
    for (const row of c.bitmap) bytes.push(...packRowBits(row))
    const name = `FONT_${idx}`
    lines.push(`/* '${c.char}' ${c.w}x${c.h} */`)
    lines.push(`const unsigned char ${name}[${bytes.length}] = {${bytes.map(toHex).join(', ')}};`)
  })
  return lines.join('\n')
}
