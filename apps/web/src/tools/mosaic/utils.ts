/**
 * mosaic 纯函数：参数解析、文件名构造、错误提取。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 默认块大小 16px */
export const DEFAULT_BLOCK_SIZE = 16
export const MIN_BLOCK_SIZE = 4
export const MAX_BLOCK_SIZE = 64
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析块大小 4–64 整数；空串用默认 16 */
export function parseBlockSize(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_BLOCK_SIZE
  if (!/^\d+$/.test(t))
    throw new Error(`块大小无效：${raw}（须为 ${MIN_BLOCK_SIZE}–${MAX_BLOCK_SIZE} 的整数）`)
  const b = Number(t)
  if (b < MIN_BLOCK_SIZE || b > MAX_BLOCK_SIZE)
    throw new Error(`块大小超出范围：${raw}（须为 ${MIN_BLOCK_SIZE}–${MAX_BLOCK_SIZE} 的整数）`)
  return b
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + -mosaic 后缀并按格式替换扩展名 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-mosaic.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
