/**
 * brightness-contrast 纯函数：参数解析、滤镜字符串构造、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_LEVEL = 0
export const LEVEL_MIN = -100
export const LEVEL_MAX = 100
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析亮度/对比度 -100~100；空串用默认 0；须为整数 */
export function parseLevel(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_LEVEL
  if (!/^-?\d+$/.test(t)) throw new Error(`取值无效：${raw}（须为 -100~100 的整数）`)
  const level = Number(t)
  if (level < LEVEL_MIN || level > LEVEL_MAX) {
    throw new Error(`取值超出范围：${raw}（须为 -100~100 的整数）`)
  }
  return level
}

/**
 * 构造 ctx.filter 滤镜字符串。
 * 亮度与对比度都为 0 时返回 'none'（等价于原图）；否则返回
 * `brightness(<倍率>) contrast(<倍率>)`，倍率 = 1 + level/100。
 */
export function buildBrightnessContrastFilter(brightness: number, contrast: number): string {
  if (brightness === 0 && contrast === 0) return 'none'
  return `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100})`
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-brightness-contrast.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
