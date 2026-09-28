/**
 * exif-remove 纯函数：参数解析、文件名构造、节省量文本。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** JPEG 输出固定质量（0–1，传给 canvas.toBlob） */
export const JPEG_QUALITY = 0.92
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export type OutputFormat = 'jpeg' | 'png'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验输出格式；非法抛错 */
export function parseFormat(raw: string): OutputFormat {
  const t = raw.trim().toLowerCase()
  if (t === 'jpeg') return 'jpeg'
  if (t === 'png') return 'png'
  throw new Error(`格式无效：${raw}（仅支持 jpeg/png）`)
}

/** 选项 format 转 MIME */
export function formatToMime(format: OutputFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png'
}

/** 构造输出文件名：原名去扩展名 + '-noexif' + 新扩展名 */
export function buildOutputFileName(originalName: string, format: OutputFormat): string {
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-noexif.${ext}`
}

/** 人性化字节数（utils 内自包含：KB 保留 1 位小数，MB 保留 2 位） */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 节省量文本：如 "节省 12.3 KB（15.0%）"；无节省或原大小非法时给占位 */
export function savedBytesText(origBytes: number, newBytes: number): string {
  if (origBytes <= 0) return '节省 0 B（—）'
  const saved = origBytes - newBytes
  const pct = ((saved / origBytes) * 100).toFixed(1)
  if (saved <= 0) return `无节省（${pct}%）`
  return `节省 ${formatSize(saved)}（${pct}%）`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
