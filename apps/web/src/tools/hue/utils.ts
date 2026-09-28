/**
 * hue 纯函数：参数解析、滤镜字符串构造、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 色相旋转角度范围（度） */
export const HUE_MIN = -180
export const HUE_MAX = 180
/** 默认角度：不旋转，输出与原图一致 */
export const DEFAULT_HUE = 0
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析色相旋转角度 -180..180 的整数；空串用默认 0 */
export function parseHue(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_HUE
  if (!/^-?\d+$/.test(t)) throw new Error(`色相角度无效：${raw}（须为 -180..180 的整数）`)
  const h = Number(t)
  if (h < HUE_MIN || h > HUE_MAX)
    throw new Error(`色相角度超出范围：${raw}（须为 -180..180 的整数）`)
  return h
}

/**
 * 构造 ctx.filter 字符串。
 * hue=0 返回 'none'（不应用滤镜，输出与原图一致），否则返回 hue-rotate()。
 */
export function buildHueRotateFilter(hue: number): string {
  if (hue === 0) return 'none'
  return `hue-rotate(${hue}deg)`
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + 后缀 -hue，按格式替换扩展名 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-hue.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
