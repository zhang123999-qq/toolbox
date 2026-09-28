/**
 * image-to-avif 纯函数：参数解析、尺寸计算、文件名构造、AVIF 特性探测结果判定。
 * 不触碰 DOM/Canvas，可 100% 单测。
 *
 * AVIF 编码依赖浏览器对 canvas.toBlob('image/avif') 的支持：
 * 探测逻辑（1×1 小 canvas + toBlob 调用）放在 Tool.tsx（需 DOM），
 * 这里的 isAvifEncodeSupported 只做纯的结果判定。
 */

export const DEFAULT_QUALITY = 80
export const MAX_DIMENSION_LIMIT = 16384
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** AVIF 输出 MIME */
export const AVIF_MIME = 'image/avif'

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

/** 解析最大边；空串/0 = 不限；上限 16384 */
export function parseMaxDimension(raw: string): number {
  const t = raw.trim()
  if (t === '') return 0
  if (!/^\d+$/.test(t)) throw new Error(`尺寸无效：${raw}（须为非负整数，0 表示不限）`)
  const d = Number(t)
  if (d > MAX_DIMENSION_LIMIT) throw new Error(`尺寸过大：${raw}（上限 ${MAX_DIMENSION_LIMIT}）`)
  return d
}

/** 按最大边等比缩放；任一边超限才缩，不过限原样返回 */
export function computeOutputDimensions(
  srcW: number,
  srcH: number,
  maxDimension: number,
): { width: number; height: number } {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (maxDimension <= 0) return { width: srcW, height: srcH }
  const longest = Math.max(srcW, srcH)
  if (longest <= maxDimension) return { width: srcW, height: srcH }
  const scale = maxDimension / longest
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  }
}

/** 构造输出文件名：原名 + -avif 后缀，扩展名固定 .avif */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-avif.avif`
}

/** 体积占比文本：new/orig，保留 1 位小数 */
export function compressionRatioText(origBytes: number, newBytes: number): string {
  if (origBytes <= 0) return '—'
  const ratio = (newBytes / origBytes) * 100
  return `${ratio.toFixed(1)}%`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * AVIF 编码特性探测结果判定（纯函数）。
 * toBlob 回调拿到 null/undefined，或返回的 Blob 不是 AVIF 类型 → 不支持 AVIF 编码。
 */
export function isAvifEncodeSupported(blob: Blob | null | undefined): boolean {
  return blob instanceof Blob && blob.type === AVIF_MIME
}
