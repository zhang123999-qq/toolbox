/**
 * pixelate 纯函数：参数解析、文件名构造、格式映射。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 默认像素块大小 8px */
export const DEFAULT_PIXEL_SIZE = 8
/** 像素块大小下限 2px */
export const MIN_PIXEL_SIZE = 2
/** 像素块大小上限 64px */
export const MAX_PIXEL_SIZE = 64
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析像素块大小 2–64；空串用默认 8；块越大像素颗粒越粗 */
export function parsePixelSize(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_PIXEL_SIZE
  if (!/^\d+$/.test(t)) throw new Error(`像素块大小无效：${raw}（须为 2–64 的整数）`)
  const n = Number(t)
  if (n < MIN_PIXEL_SIZE || n > MAX_PIXEL_SIZE)
    throw new Error(`像素块大小超出范围：${raw}（须为 2–64 的整数）`)
  return n
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + -pixelate 后缀按格式替换扩展名 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-pixelate.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
