/**
 * background-remove 纯函数：颜色距离、边缘采样、洪水填充抠除、色度键、参数解析。
 * 输入均为纯对象 { data, width, height }，不触碰 DOM/Canvas，可 100% 单测。
 *
 * 容差映射：tolerance（0–100）→ 距离平方阈值 = ((tolerance / 100) * 441.67)^2，
 * 其中 441.67 = sqrt(3 × 255²) 为 RGB 立方体对角线长度（黑到白的最大欧氏距离）。
 * tolerance=0 仅移除与背景色完全相同的像素；tolerance=100 时阈值约为 195073，
 * 覆盖整个 RGB 色域（边缘抠除会把整图抠透明，色度键同理）。
 */

/** 容差默认值 25（0–100） */
export const DEFAULT_TOLERANCE = 25
/** 容差上限 */
export const MAX_TOLERANCE = 100
/** RGB 色域对角线长度 sqrt(3 × 255²) ≈ 441.673 */
export const MAX_COLOR_DISTANCE = Math.sqrt(3 * 255 * 255)
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** RGB 三元组（0–255 整数） */
export type RGB = readonly [number, number, number]

/** 像素缓冲：纯对象，不依赖 Canvas ImageData */
export interface PixelBuffer {
  data: Uint8ClampedArray | number[]
  width: number
  height: number
}

/** 移除结果：处理后的数据拷贝 + 被置透明的像素数 */
export interface RemoveResult {
  data: Uint8ClampedArray
  removed: number
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验像素缓冲的尺寸与数据长度一致 */
function assertBuffer(buf: PixelBuffer): void {
  if (!Number.isInteger(buf.width) || buf.width <= 0) throw new Error('图片宽度无效')
  if (!Number.isInteger(buf.height) || buf.height <= 0) throw new Error('图片高度无效')
  if (buf.data.length !== buf.width * buf.height * 4) {
    throw new Error('像素数据长度与尺寸不匹配')
  }
}

/** RGB 欧氏距离的平方（避免开方，比较阈值时直接用平方值） */
export function colorDistanceSq(c1: RGB, c2: RGB): number {
  const dr = c1[0] - c2[0]
  const dg = c1[1] - c2[1]
  const db = c1[2] - c2[2]
  return dr * dr + dg * dg + db * db
}

/**
 * 采样四角 + 四条边中点共 8 个像素的 RGB 均值，作为背景色估计。
 * 注：采样的是原始 RGB（含已透明像素，其 RGB 常为 0），简单可预测；
 * 纯色/渐变背景下均值即为背景色。
 */
export function sampleEdgeColor(buf: PixelBuffer): RGB {
  assertBuffer(buf)
  const { data, width, height } = buf
  const midX = Math.floor(width / 2)
  const midY = Math.floor(height / 2)
  const points: Array<readonly [number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [midX, 0],
    [midX, height - 1],
    [0, midY],
    [width - 1, midY],
  ]
  let r = 0
  let g = 0
  let b = 0
  for (const [x, y] of points) {
    const i = (y * width + x) * 4
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const n = points.length
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

/** 容差 0–100 → 颜色距离平方阈值；非法输入抛错 */
export function toleranceToDistSq(tolerance: number): number {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > MAX_TOLERANCE) {
    throw new Error(`容差无效：${tolerance}（须为 0–100）`)
  }
  const dist = (tolerance / 100) * MAX_COLOR_DISTANCE
  return dist * dist
}

/**
 * 边缘洪水填充抠除：从四条边的所有像素出发做 BFS，只穿过
 * 与背景色（sampleEdgeColor）距离 ≤ distSq 的像素，把连通域置透明。
 * 用显式栈代替递归，避免大图爆栈；返回数据拷贝与被置透明的像素数。
 * 已透明像素不计入 removed（全透明图会返回 removed=0，调用方可据此提示）。
 */
export function floodFillRemove(buf: PixelBuffer, distSq: number): RemoveResult {
  assertBuffer(buf)
  if (!Number.isFinite(distSq) || distSq < 0) throw new Error('距离阈值无效')
  const { data, width, height } = buf
  const bg = sampleEdgeColor(buf)
  const out = new Uint8ClampedArray(data)
  const visited = new Uint8Array(width * height)
  const stack = new Int32Array(width * height)
  let top = 0
  let removed = 0

  const tryPush = (p: number): void => {
    if (visited[p]) return
    visited[p] = 1
    const i = p * 4
    const c: RGB = [out[i], out[i + 1], out[i + 2]]
    if (colorDistanceSq(c, bg) > distSq) return
    if (out[i + 3] > 0) {
      out[i + 3] = 0
      removed++
    }
    stack[top++] = p
  }

  // 四条边的全部像素作为种子
  for (let x = 0; x < width; x++) {
    tryPush(x)
    tryPush((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    tryPush(y * width)
    tryPush(y * width + (width - 1))
  }

  while (top > 0) {
    const p = stack[--top]
    const x = p % width
    const y = Math.floor(p / width)
    if (x > 0) tryPush(p - 1)
    if (x < width - 1) tryPush(p + 1)
    if (y > 0) tryPush(p - width)
    if (y < height - 1) tryPush(p + width)
  }

  return { data: out, removed }
}

/**
 * 色度键抠除：全图遍历，与目标色距离 ≤ distSq 的像素置透明。
 * 返回数据拷贝与被置透明的像素数；已透明像素跳过不计。
 */
export function chromaKeyRemove(buf: PixelBuffer, target: RGB, distSq: number): RemoveResult {
  assertBuffer(buf)
  if (!Number.isFinite(distSq) || distSq < 0) throw new Error('距离阈值无效')
  const { data, width, height } = buf
  const out = new Uint8ClampedArray(data)
  let removed = 0
  for (let p = 0; p < width * height; p++) {
    const i = p * 4
    if (out[i + 3] === 0) continue
    const c: RGB = [out[i], out[i + 1], out[i + 2]]
    if (colorDistanceSq(c, target) <= distSq) {
      out[i + 3] = 0
      removed++
    }
  }
  return { data: out, removed }
}

/** 解析容差 0–100 的整数；空串用默认 25 */
export function parseTolerance(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_TOLERANCE
  if (!/^\d+$/.test(t)) throw new Error(`容差无效：${raw}（须为 0–100 的整数）`)
  const v = Number(t)
  if (v > MAX_TOLERANCE) throw new Error(`容差超出范围：${raw}（须为 0–100 的整数）`)
  return v
}

/** 解析 #rrggbb 颜色；返回 [r, g, b] */
export function parseHexColor(raw: string): RGB {
  const t = raw.trim()
  const m = /^#([0-9a-fA-F]{6})$/.exec(t)
  if (!m) throw new Error(`颜色无效：${raw}（须为 #rrggbb 格式）`)
  const hex = m[1]
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ]
}

/** 构造输出文件名：原名去扩展名 + -nobg.png */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-nobg.png`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
