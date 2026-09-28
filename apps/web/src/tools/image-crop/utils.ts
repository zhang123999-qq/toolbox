/**
 * image-crop 纯函数：裁剪参数解析、矩形计算、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 裁剪矩形（像素） */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** 纵横比预设 */
export const ASPECT_PRESETS = ['free', '1:1', '4:3', '3:4', '16:9', '9:16'] as const
export type AspectPreset = (typeof ASPECT_PRESETS)[number]

/** 输出格式 */
export const OUTPUT_FORMATS = ['jpeg', 'png', 'webp'] as const
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export const DEFAULT_QUALITY = 80
/** 裁剪坐标/尺寸上限（像素） */
export const MAX_CROP_VALUE = 16384
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

const ASPECT_VALUES: Record<Exclude<AspectPreset, 'free'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

/** 校验图片尺寸有效（内部共用） */
function assertValidImageSize(imgW: number, imgH: number): void {
  if (!Number.isFinite(imgW) || !Number.isFinite(imgH) || imgW <= 0 || imgH <= 0) {
    throw new Error('图片尺寸无效')
  }
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析质量 1–100；空串用默认 80 */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
}

/** 解析裁剪坐标/尺寸：非负整数；空串/非法/超限均抛错 */
export function parseCropNumber(raw: string): number {
  const t = raw.trim()
  if (t === '') throw new Error('裁剪参数不能为空（须为非负整数）')
  if (!/^\d+$/.test(t)) throw new Error(`裁剪参数无效：${raw}（须为非负整数）`)
  const n = Number(t)
  if (n > MAX_CROP_VALUE) throw new Error(`裁剪参数过大：${raw}（上限 ${MAX_CROP_VALUE}）`)
  return n
}

/** 把矩形钳制到图片范围内；宽高至少 1px */
export function clampRectToImage(rect: CropRect, imgW: number, imgH: number): CropRect {
  assertValidImageSize(imgW, imgH)
  const x = Math.min(Math.max(Math.round(rect.x), 0), imgW - 1)
  const y = Math.min(Math.max(Math.round(rect.y), 0), imgH - 1)
  const width = Math.min(Math.max(Math.round(rect.width), 1), imgW - x)
  const height = Math.min(Math.max(Math.round(rect.height), 1), imgH - y)
  return { x, y, width, height }
}

/** 预设纵横比数值；'free' 返回 undefined */
export function aspectRatioValue(preset: AspectPreset): number | undefined {
  if (preset === 'free') return undefined
  return ASPECT_VALUES[preset]
}

/**
 * 按预设纵横比调整矩形：保持当前 x/y/宽，由宽算高；
 * 新矩形按原矩形中心居中，再钳制到图片内。'free' 原样返回。
 */
export function applyAspectRatio(
  rect: CropRect,
  preset: AspectPreset,
  imgW: number,
  imgH: number,
): CropRect {
  const ratio = aspectRatioValue(preset)
  if (ratio === undefined) return { ...rect }
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(width / ratio))
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return clampRectToImage(
    { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2), width, height },
    imgW,
    imgH,
  )
}

/** 居中正方形：边长取图片短边 */
export function centerSquareRect(imgW: number, imgH: number): CropRect {
  assertValidImageSize(imgW, imgH)
  const side = Math.min(imgW, imgH)
  return {
    x: Math.floor((imgW - side) / 2),
    y: Math.floor((imgH - side) / 2),
    width: side,
    height: side,
  }
}

/** 最大区域：整张图片 */
export function maxRect(imgW: number, imgH: number): CropRect {
  assertValidImageSize(imgW, imgH)
  return { x: 0, y: 0, width: imgW, height: imgH }
}

/** 裁剪矩形转 CSS 百分比定位（原图遮罩层用） */
export function rectToPercentStyle(
  rect: CropRect,
  imgW: number,
  imgH: number,
): { left: string; top: string; width: string; height: string } {
  assertValidImageSize(imgW, imgH)
  return {
    left: `${(rect.x / imgW) * 100}%`,
    top: `${(rect.y / imgH) * 100}%`,
    width: `${(rect.width / imgW) * 100}%`,
    height: `${(rect.height / imgH) * 100}%`,
  }
}

/** 选项 format 转 MIME */
export function formatToMime(format: OutputFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** PNG 为无损，质量参数不生效，返回 undefined 让调用方感知 */
export function effectiveQuality(format: OutputFormat, quality: number): number | undefined {
  if (format === 'png') return undefined
  return quality / 100
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: OutputFormat): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-cropped.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
