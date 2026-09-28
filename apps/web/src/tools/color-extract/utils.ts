/**
 * color-extract 纯函数：颜色转换、均匀量化调色板提取、参数解析、文件校验。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 默认提取颜色数量 */
export const DEFAULT_COLOR_COUNT = 6
/** 颜色数量下限 */
export const MIN_COLOR_COUNT = 3
/** 颜色数量上限 */
export const MAX_COLOR_COUNT = 10
/** 统计前下采样边长：先把图片缩到 100×100 再统计，兼顾速度与代表性 */
export const DOWNSAMPLE_SIZE = 100
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * i18n 键合并前的兜底：翻译缺失（undefined/空串）时返回 fallback，
 * 保证错误提示在任何情况下都可读。分支由单测全覆盖。
 */
export function withFallback(translated: string | undefined, fallback: string): string {
  return translated === undefined || translated === '' ? fallback : translated
}

/** RGB 转 HEX（#rrggbb 小写）；通道钳制到 0–255 并四舍五入 */
export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** 调色板条目：代表色 + 频次 + 占比（count/total） */
export interface PaletteColor {
  hex: string
  r: number
  g: number
  b: number
  count: number
  ratio: number
}

/**
 * 均匀量化调色板提取（纯函数，输入为 RGBA 像素数组，不碰 DOM）。
 *
 * 算法：
 *  1. RGB 每通道取高 4 bit，组成 12 bit 桶序号（16×16×16 = 4096 桶），逐像素计数；
 *  2. 按频次降序（频次相同按桶序号升序，保证确定性）取前 count 个桶；
 *  3. 每个桶的代表色取桶内像素各通道的算术均值（四舍五入）。
 * Alpha 通道不参与统计：透明像素仍按其 RGB 计入桶。
 */
export function extractPalette(pixels: ArrayLike<number>, count: number): PaletteColor[] {
  const total = Math.floor(pixels.length / 4)
  if (total <= 0 || count <= 0) return []
  const BUCKET_COUNT = 4096
  const counts = new Uint32Array(BUCKET_COUNT)
  const sumR = new Float64Array(BUCKET_COUNT)
  const sumG = new Float64Array(BUCKET_COUNT)
  const sumB = new Float64Array(BUCKET_COUNT)
  for (let i = 0; i < total; i++) {
    const o = i * 4
    const r = pixels[o]
    const g = pixels[o + 1]
    const b = pixels[o + 2]
    // 高 4 bit 量化：桶序号 = r4<<8 | g4<<4 | b4
    const bucket = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    counts[bucket] += 1
    sumR[bucket] += r
    sumG[bucket] += g
    sumB[bucket] += b
  }
  const entries: Array<{ bucket: number; count: number }> = []
  for (let b = 0; b < BUCKET_COUNT; b++) {
    if (counts[b] > 0) entries.push({ bucket: b, count: counts[b] })
  }
  entries.sort((a, b) => b.count - a.count || a.bucket - b.bucket)
  const top = entries.slice(0, Math.max(1, Math.floor(count)))
  return top.map(({ bucket, count: c }) => {
    const r = Math.round(sumR[bucket] / c)
    const g = Math.round(sumG[bucket] / c)
    const b = Math.round(sumB[bucket] / c)
    return { hex: rgbToHex(r, g, b), r, g, b, count: c, ratio: c / total }
  })
}

/** 解析颜色数量 3–10；空串用默认 6 */
export function parseColorCount(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_COLOR_COUNT
  if (!/^\d+$/.test(t)) {
    throw new Error(`颜色数量无效：${raw}（须为 ${MIN_COLOR_COUNT}–${MAX_COLOR_COUNT} 的整数）`)
  }
  const n = Number(t)
  if (n < MIN_COLOR_COUNT || n > MAX_COLOR_COUNT) {
    throw new Error(`颜色数量超出范围：${raw}（须为 ${MIN_COLOR_COUNT}–${MAX_COLOR_COUNT} 的整数）`)
  }
  return n
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
