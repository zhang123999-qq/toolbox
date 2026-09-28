/**
 * image-rotate 纯函数：角度解析/归一化、旋转包围盒、文件名构造等。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_QUALITY = 90
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析旋转角度：空串→0；须为 -360~360 的数字，可含小数；非法抛错 */
export function parseAngle(raw: string): number {
  const t = raw.trim()
  if (t === '') return 0
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(t)) {
    throw new Error(`角度无效：${raw}（须为 -360~360 的数字）`)
  }
  const a = Number(t)
  if (a < -360 || a > 360) {
    throw new Error(`角度超出范围：${raw}（须为 -360~360）`)
  }
  return a
}

/** 角度归一化到 [0, 360) */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** 是否为直角（0/90/180/270）：直角旋转图片恰好铺满画布，无需扩大也无需背景填充 */
export function isRightAngle(deg: number): boolean {
  return Math.abs(normalizeAngle(deg) % 90) < 1e-9
}

/**
 * 旋转后的包围盒（纯数学）：宽 = |w·cosθ| + |h·sinθ|，高 = |w·sinθ| + |h·cosθ|。
 * 宽高至少 1，保证 Canvas 尺寸合法。
 */
export function rotatedBounds(
  w: number,
  h: number,
  deg: number,
): { width: number; height: number } {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (!Number.isFinite(deg)) {
    throw new Error('角度无效')
  }
  const rad = (normalizeAngle(deg) * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    width: Math.max(1, Math.round(w * cos + h * sin)),
    height: Math.max(1, Math.round(w * sin + h * cos)),
  }
}

/** 解析质量 1–100；空串用默认 90（旋转不做压缩意图，默认高质量） */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
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

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-rotated.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
