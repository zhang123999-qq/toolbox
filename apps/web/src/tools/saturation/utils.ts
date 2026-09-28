/**
 * saturation 纯函数：参数解析、滤镜构造、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_SATURATION = 100
export const SATURATION_MAX = 200
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析饱和度 0–200；空串用默认 100 */
export function parseSaturation(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_SATURATION
  if (!/^\d+$/.test(t)) throw new Error(`饱和度无效：${raw}（须为 0–200 的整数）`)
  const s = Number(t)
  if (s < 0 || s > SATURATION_MAX) throw new Error(`饱和度超出范围：${raw}（须为 0–200 的整数）`)
  return s
}

/** 构造 ctx.filter 的 saturate() 字符串：100 → saturate(1)，为恒等变换 */
export function buildSaturateFilter(saturation: number): string {
  return `saturate(${saturation / 100})`
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-saturation.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
