/**
 * image-round 纯函数：半径解析/换算、背景色解析、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const MAX_RADIUS_PX = 16384
export const MAX_RADIUS_PERCENT = 100
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** JPEG 输出质量固定最高，不暴露为选项（减少分支） */
export const OUTPUT_QUALITY = 1

export type RadiusUnit = 'px' | '%'
export type RoundMode = 'round' | 'circle'
export type Background = 'transparent' | 'white' | 'custom'
export type OutputFormat = 'png' | 'jpeg'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * 解析圆角半径：非负数，可小数；空串视为 0。
 * px 上限 16384，% 上限 100；非法抛错。
 */
export function parseRadius(raw: string, unit: RadiusUnit): number {
  const t = raw.trim()
  if (t === '') return 0
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error(`半径无效：${raw}（须为非负数，可带小数）`)
  const r = Number(t)
  const limit = unit === '%' ? MAX_RADIUS_PERCENT : MAX_RADIUS_PX
  if (r > limit) throw new Error(`半径过大：${raw}（上限 ${limit}${unit}）`)
  return r
}

/**
 * 半径换算为像素：% 相对短边；结果钳制到短边一半以内
 * （圆角半径超过短边一半没有意义）。
 */
export function radiusToPx(radius: number, unit: RadiusUnit, w: number, h: number): number {
  if (!Number.isFinite(radius) || radius < 0) throw new Error('半径无效')
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error('图片尺寸无效')
  }
  const shortSide = Math.min(w, h)
  const px = unit === '%' ? (radius / 100) * shortSide : radius
  return Math.min(Math.max(0, px), shortSide / 2)
}

/** 圆形裁剪直径 = 短边（以中心为圆心的内切圆，输出正方形） */
export function circleDiameter(w: number, h: number): number {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error('图片尺寸无效')
  }
  return Math.min(w, h)
}

/** 选项 format 转 MIME */
export function formatToMime(format: OutputFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png'
}

/** JPEG 固定最高质量；PNG 为无损，质量参数不生效，返回 undefined 让调用方感知 */
export function effectiveQuality(format: OutputFormat): number | undefined {
  return format === 'png' ? undefined : OUTPUT_QUALITY
}

/**
 * 解析背景填充色：返回 null 表示保持透明（仅 PNG 可行）。
 * 透明 + JPEG 时 JPEG 不支持 alpha 通道，按白色填充，调用方负责在界面提示用户。
 */
export function resolveFillStyle(
  background: Background,
  customColor: string,
  format: OutputFormat,
): string | null {
  if (background === 'transparent') {
    return format === 'png' ? null : '#ffffff'
  }
  if (background === 'white') return '#ffffff'
  return customColor
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: OutputFormat): string {
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-rounded.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
