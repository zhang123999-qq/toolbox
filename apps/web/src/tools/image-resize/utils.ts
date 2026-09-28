/**
 * image-resize 纯函数：参数解析、尺寸计算、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_QUALITY = 80
/** 像素模式下宽/高的上限（浏览器 Canvas 安全边界） */
export const MAX_PIXEL_LIMIT = 16384
/** 百分比模式的取值范围 */
export const MIN_PERCENT = 1
export const MAX_PERCENT = 1000
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

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

/** 解析正整数像素值；空串/非法/超限抛错，上限 16384 */
export function parsePositiveInt(raw: string): number {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) {
    throw new Error(`宽高无效：${raw}（须为 1–${MAX_PIXEL_LIMIT} 的正整数）`)
  }
  const n = Number(t)
  if (n < 1 || n > MAX_PIXEL_LIMIT) {
    throw new Error(`宽高超出范围：${raw}（须为 1–${MAX_PIXEL_LIMIT} 的正整数）`)
  }
  return n
}

/** 解析缩放百分比 1–1000，可含小数（如 12.5） */
export function parsePercent(raw: string): number {
  const t = raw.trim()
  if (!/^\d+(\.\d+)?$/.test(t)) {
    throw new Error(`百分比无效：${raw}（须为 ${MIN_PERCENT}–${MAX_PERCENT} 的数字，可含小数）`)
  }
  const p = Number(t)
  if (p < MIN_PERCENT || p > MAX_PERCENT) {
    throw new Error(`百分比超出范围：${raw}（须为 ${MIN_PERCENT}–${MAX_PERCENT}）`)
  }
  return p
}

export interface PixelSize {
  width: number
  height: number
}

/**
 * 像素模式目标尺寸计算。
 * lock=true（锁定纵横比）：只给宽→高按原图比例；只给高→宽按原图比例；
 * 宽高都给→直取；都没给→原图尺寸。
 * lock=false：给什么用什么，没给的边用原图尺寸。
 * 计算结果至少 1px。
 */
export function computePixelSize(
  srcW: number,
  srcH: number,
  targetW: number | undefined,
  targetH: number | undefined,
  lock: boolean,
): PixelSize {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (lock) {
    if (targetW !== undefined && targetH !== undefined) return { width: targetW, height: targetH }
    if (targetW !== undefined) {
      return { width: targetW, height: Math.max(1, Math.round((targetW * srcH) / srcW)) }
    }
    if (targetH !== undefined) {
      return { width: Math.max(1, Math.round((targetH * srcW) / srcH)), height: targetH }
    }
    return { width: srcW, height: srcH }
  }
  return { width: targetW ?? srcW, height: targetH ?? srcH }
}

/** 百分比模式目标尺寸计算；结果至少 1px */
export function computePercentSize(srcW: number, srcH: number, percent: number): PixelSize {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  return {
    width: Math.max(1, Math.round((srcW * percent) / 100)),
    height: Math.max(1, Math.round((srcH * percent) / 100)),
  }
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** PNG 为无损，质量参数不生效，返回 undefined 让调用方感知 */
export function effectiveQuality(
  format: 'jpeg' | 'png' | 'webp',
  quality: number,
): number | undefined {
  if (format === 'png') return undefined
  return quality / 100
}

/** 构造输出文件名：原名 + 目标尺寸 + 按格式替换后缀 */
export function buildOutputFileName(
  originalName: string,
  format: 'jpeg' | 'png' | 'webp',
  width: number,
  height: number,
): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-${width}x${height}.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
