/**
 * png-to-svg 纯函数：参数解析、海报化分层、位图描摹、SVG 组装。
 * 不触碰 DOM/Canvas，可 100% 单测。
 *
 * 描摹算法说明：marching squares 的 16-case 查表在此退化为「填充格渲染」——
 * 逐行扫描把每层的连续前景像素合并为水平矩形，每个矩形输出为一个 SVG 子路径。
 * 这样做刻意避开了轮廓拼接的 saddle case（5/10）与孔洞环绕歧义，
 * 选择的是「能保证零 Bug」的实现；代价是曲线边缘呈阶梯状（诚实说明见 README）。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export const DEFAULT_COLORS = 4
export const MAX_COLORS = 8
export const MIN_COLORS = 2

export const DEFAULT_MAX_EDGE = 256
export const MIN_MAX_EDGE = 64
export const MAX_MAX_EDGE = 1024

export const DEFAULT_MIN_AREA = 4
export const MAX_MIN_AREA = 1000000

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析颜色数 2–8；空串用默认 4 */
export function parseColors(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_COLORS
  if (!/^\d+$/.test(t))
    throw new Error(`颜色数无效：${raw}（须为 ${MIN_COLORS}–${MAX_COLORS} 的整数）`)
  const n = Number(t)
  if (n < MIN_COLORS || n > MAX_COLORS)
    throw new Error(`颜色数超出范围：${raw}（须为 ${MIN_COLORS}–${MAX_COLORS} 的整数）`)
  return n
}

/** 解析最大边 64–1024；空串用默认 256 */
export function parseMaxEdge(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_MAX_EDGE
  if (!/^\d+$/.test(t))
    throw new Error(`最大边无效：${raw}（须为 ${MIN_MAX_EDGE}–${MAX_MAX_EDGE} 的整数）`)
  const n = Number(t)
  if (n < MIN_MAX_EDGE || n > MAX_MAX_EDGE)
    throw new Error(`最大边超出范围：${raw}（须为 ${MIN_MAX_EDGE}–${MAX_MAX_EDGE} 的整数）`)
  return n
}

/** 解析最小色块面积（px²）；空串用默认 4；0 表示不过滤 */
export function parseMinArea(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_MIN_AREA
  if (!/^\d+$/.test(t)) throw new Error(`最小色块无效：${raw}（须为非负整数）`)
  const n = Number(t)
  if (n > MAX_MIN_AREA) throw new Error(`最小色块过大：${raw}（上限 ${MAX_MIN_AREA}）`)
  return n
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 按最大边等比缩放；任一边超限才缩，不过限原样返回（maxEdge 恒 > 0，无"不限"分支） */
export function scaledSize(
  srcW: number,
  srcH: number,
  maxEdge: number,
): { width: number; height: number } {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (Math.max(srcW, srcH) <= maxEdge) return { width: srcW, height: srcH }
  const scale = maxEdge / Math.max(srcW, srcH)
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  }
}

/** 构造输出文件名：原名 + -vector 后缀，扩展名固定为 .svg */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-vector.svg`
}

export interface RgbPixel {
  readonly r: number
  readonly g: number
  readonly b: number
}

export interface PosterizeLayer {
  /** 代表色（#rrggbb 小写） */
  readonly color: string
  /** 二值掩膜：1=属于本层，0=不属于 */
  readonly mask: Uint8Array
}

/** 把任意数值钳到 0–255 字节（NaN/负数 → 0，≥255 → 255） */
function toByte(v: number): number {
  const n = Math.round(v)
  if (!(n >= 0)) return 0
  if (n >= 255) return 255
  return n
}

function hex2(n: number): string {
  return n.toString(16).padStart(2, '0')
}

/**
 * 海报化分层：每通道均匀量化为 colors 个等级，相同量化色的像素归入同一层。
 * 层按量化 key 升序排列（确定性顺序），代表色为反量化后的 #rrggbb。
 * 输入可为 RGBA 的 Uint8ClampedArray（长度 4×w×h）或 {r,g,b}[]（长度 w×h）。
 */
export function posterize(
  pixels: Uint8ClampedArray | RgbPixel[],
  width: number,
  height: number,
  colors: number,
): PosterizeLayer[] {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (!Number.isInteger(colors) || colors < MIN_COLORS || colors > MAX_COLORS) {
    throw new Error(`颜色数无效：${colors}（须为 ${MIN_COLORS}–${MAX_COLORS} 的整数）`)
  }
  const count = width * height
  const isClamped = pixels instanceof Uint8ClampedArray
  if (isClamped ? pixels.length !== count * 4 : pixels.length !== count) {
    throw new Error('像素数据长度与尺寸不匹配')
  }
  const levels = colors - 1
  const buckets = new Map<number, { mask: Uint8Array; qr: number; qg: number; qb: number }>()
  for (let i = 0; i < count; i++) {
    let r: number
    let g: number
    let b: number
    if (isClamped) {
      const o = i * 4
      r = pixels[o]
      g = pixels[o + 1]
      b = pixels[o + 2]
    } else {
      const p = pixels[i]
      r = toByte(p.r)
      g = toByte(p.g)
      b = toByte(p.b)
    }
    const qr = Math.round((r / 255) * levels)
    const qg = Math.round((g / 255) * levels)
    const qb = Math.round((b / 255) * levels)
    const key = (qr * colors + qg) * colors + qb
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { mask: new Uint8Array(count), qr, qg, qb }
      buckets.set(key, bucket)
    }
    bucket.mask[i] = 1
  }
  const deq = (q: number): number => Math.round((q / levels) * 255)
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => ({
      color: `#${hex2(deq(bucket.qr))}${hex2(deq(bucket.qg))}${hex2(deq(bucket.qb))}`,
      mask: bucket.mask,
    }))
}

/**
 * 描摹单层掩膜：逐行扫描，把连续前景像素合并为水平矩形，
 * 每个矩形输出为一个闭环多边形 [[x0,y],[x1,y],[x1,y+1],[x0,y+1]]。
 * 空掩膜 → []；单像素 → 1 个矩形；全图填满 → 每行 1 个矩形；碰边缘无特殊处理。
 */
export function traceLayer(mask: Uint8Array, w: number, h: number): number[][][] {
  if (!Number.isInteger(w) || w < 0 || !Number.isInteger(h) || h < 0) {
    throw new Error('掩膜尺寸无效')
  }
  if (mask.length !== w * h) throw new Error('掩膜长度与尺寸不匹配')
  const polygons: number[][][] = []
  for (let y = 0; y < h; y++) {
    let x = 0
    const row = y * w
    while (x < w) {
      if (mask[row + x] === 0) {
        x++
        continue
      }
      const x0 = x
      while (x < w && mask[row + x] !== 0) x++
      polygons.push([
        [x0, y],
        [x, y],
        [x, y + 1],
        [x0, y + 1],
      ])
    }
  }
  return polygons
}

/** 鞋带公式求多边形面积（绝对值）；退化/空多边形面积为 0 */
export function polygonArea(points: number[][]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/** 按面积过滤小色块：保留面积 >= minArea 的多边形（minArea=0 时全保留） */
export function filterSmallPolygons(polygons: number[][][], minArea: number): number[][][] {
  return polygons.filter((p) => polygonArea(p) >= minArea)
}

/** 多边形顶点转 SVG path d：M x,y L x,y … Z，坐标取整；空数组 → '' */
export function polygonsToPath(polygons: number[][][]): string {
  return polygons
    .filter((p) => p.length > 0)
    .map((p) => `M${p.map((pt) => `${Math.round(pt[0])},${Math.round(pt[1])}`).join('L')}Z`)
    .join(' ')
}

export interface SvgLayer {
  readonly color: string
  readonly d: string
}

/** 组装 SVG：viewBox + 每层一个 <path fill>；d 为空的层跳过 */
export function buildSvg(layers: SvgLayer[], width: number, height: number): string {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('SVG 尺寸无效')
  }
  const paths = layers
    .filter((l) => l.d.length > 0)
    .map((l) => `<path fill="${l.color}" d="${l.d}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${paths}</svg>`
}

/** #rrggbb 的相对亮度（0–255），用于判定"最浅色层" */
function luminanceOfHex(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** 最浅色层的下标；亮度并列时取第一层（确定性） */
function indexOfLightest(layers: PosterizeLayer[]): number {
  let best = 0
  let bestLum = luminanceOfHex(layers[0].color)
  for (let i = 1; i < layers.length; i++) {
    const lum = luminanceOfHex(layers[i].color)
    if (lum > bestLum) {
      best = i
      bestLum = lum
    }
  }
  return best
}

export interface VectorizeOptions {
  readonly colors: number
  readonly minArea: number
  /** false=丢弃最浅色层，使背景透明 */
  readonly keepBackground: boolean
}

export interface VectorizeResult {
  readonly svg: string
  /** 有实际路径的色层数 */
  readonly layerCount: number
  readonly layers: SvgLayer[]
}

/**
 * 矢量化主流程（纯函数）：海报化 → 可选丢弃最浅色层 → 逐层描摹 → 小色块过滤 → 组装 SVG。
 * posterize 在尺寸合法时恒返回 ≥1 层，因此 indexOfLightest 总是安全的。
 */
export function vectorizeImage(
  pixels: Uint8ClampedArray | RgbPixel[],
  width: number,
  height: number,
  opts: VectorizeOptions,
): VectorizeResult {
  const posterized = posterize(pixels, width, height, opts.colors)
  const kept = opts.keepBackground
    ? posterized
    : posterized.filter((_, i) => i !== indexOfLightest(posterized))
  const layers = kept.map((l) => ({
    color: l.color,
    d: polygonsToPath(filterSmallPolygons(traceLayer(l.mask, width, height), opts.minArea)),
  }))
  return {
    svg: buildSvg(layers, width, height),
    layerCount: layers.filter((l) => l.d.length > 0).length,
    layers,
  }
}
