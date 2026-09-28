/**
 * color-adjust 纯函数：参数解析、像素级调色、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 * 三项调节互不重叠：只做色温（冷暖）/色调（品绿）/曝光，不碰
 * 亮度/对比度（#436）、饱和度（#437）、色相（#438）。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 调色参数取值范围 */
export const COLOR_VALUE_MIN = -100
export const COLOR_VALUE_MAX = 100

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析调色参数 -100–100 整数；空串用默认 0 */
export function parseColorValue(raw: string): number {
  const t = raw.trim()
  if (t === '') return 0
  if (!/^-?\d+$/.test(t)) throw new Error(`调色参数无效：${raw}（须为 -100–100 的整数）`)
  const v = Number(t)
  if (v < COLOR_VALUE_MIN || v > COLOR_VALUE_MAX) {
    throw new Error(`调色参数超出范围：${raw}（须为 -100–100 的整数）`)
  }
  return v
}

/** 钳制到 0–255 并取整 */
function clamp255(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)))
}

/**
 * 单像素调色（纯函数）。
 * - temperature（色温）：t>0 偏暖（r+、b−），t<0 偏冷（r−、b+）
 * - tint（色调）：n>0 偏品红（g−、r+、b+），n<0 偏绿（g+、r−、b−）
 * - exposure（曝光）：整体乘以 (1 + e/100)，e=−100 全黑
 * 三项全为 0 时返回原值。
 */
export function adjustPixel(
  r: number,
  g: number,
  b: number,
  temperature: number,
  tint: number,
  exposure: number,
): [number, number, number] {
  let nr = r + temperature * 0.45 + tint * 0.15
  let ng = g - tint * 0.3
  let nb = b - temperature * 0.45 + tint * 0.15
  const factor = 1 + exposure / 100
  nr *= factor
  ng *= factor
  nb *= factor
  return [clamp255(nr), clamp255(ng), clamp255(nb)]
}

/**
 * 整图调色：逐像素调用 adjustPixel，alpha 通道原样保留。
 * data 长度必须等于 width*height*4，否则抛错。
 */
export function adjustPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  temperature: number,
  tint: number,
  exposure: number,
): Uint8ClampedArray<ArrayBuffer> {
  if (data.length !== width * height * 4) {
    throw new Error(`像素数据长度不匹配：期望 ${width * height * 4}，实际 ${data.length}`)
  }
  const out: Uint8ClampedArray<ArrayBuffer> = new Uint8ClampedArray(data.length)
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = adjustPixel(data[i], data[i + 1], data[i + 2], temperature, tint, exposure)
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
    out[i + 3] = data[i + 3]
  }
  return out
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-color-adjust.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
