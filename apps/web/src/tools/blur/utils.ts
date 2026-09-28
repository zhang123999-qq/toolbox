/**
 * blur 纯函数：半径解析、滤镜字符串构造、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_RADIUS = 10
export const MAX_RADIUS = 50
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析模糊半径 0–50（px，允许小数）；空串用默认 10 */
export function parseRadius(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_RADIUS
  const r = Number(t)
  if (!Number.isFinite(r)) throw new Error(`半径无效：${raw}（须为 0–50 的数字）`)
  if (r < 0 || r > MAX_RADIUS) throw new Error(`半径超出范围：${raw}（须为 0–50）`)
  return r
}

/** 构造 ctx.filter 字符串：半径≤0 返回 'none'（原样绘制，效果无变化） */
export function buildBlurFilter(radius: number): string {
  return radius <= 0 ? 'none' : `blur(${radius}px)`
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-blur.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
