/**
 * image-dimension 纯函数：参数解析、适配布局几何计算、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_QUALITY = 80
export const DEFAULT_BG_COLOR = '#ffffff'
/** 目标宽高上限（浏览器 Canvas 安全边界） */
export const DIMENSION_LIMIT = 16384
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析目标宽/高：须为 1–16384 的整数；空串视为未填，同样抛错 */
export function parseDimension(raw: string, label: string): number {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) throw new Error(`${label}无效：${raw}（须为 1–${DIMENSION_LIMIT} 的整数）`)
  const d = Number(t)
  if (d < 1 || d > DIMENSION_LIMIT) {
    throw new Error(`${label}超出范围：${raw}（须为 1–${DIMENSION_LIMIT} 的整数）`)
  }
  return d
}

/**
 * 解析留白背景色：接受 #rrggbb / #rgb（大小写均可），归一化为小写 #rrggbb；
 * 其他一律抛错。
 */
export function parseBgColor(raw: string): string {
  const t = raw.trim()
  const short = /^#([0-9a-fA-F]{3})$/.exec(t)
  if (short) {
    const [r, g, b] = short[1]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase()
  throw new Error(`背景色无效：${raw}（须为 #rrggbb 或 #rgb 格式，如 #ffffff）`)
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

/** 校验源图尺寸合法 */
function assertSrcSize(srcW: number, srcH: number, dstW: number, dstH: number): void {
  for (const [v, name] of [
    [srcW, '源图宽'],
    [srcH, '源图高'],
    [dstW, '目标宽'],
    [dstH, '目标高'],
  ] as const) {
    if (!Number.isFinite(v) || v <= 0) throw new Error(`图片尺寸无效：${name}`)
  }
}

/**
 * contain（等比留白）布局：整图完整可见，等比缩放到恰好容纳，
 * 返回在目标画布上的绘制矩形（绘制宽高 + 居中偏移）。
 */
export function computeContainLayout(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { drawW: number; drawH: number; offsetX: number; offsetY: number } {
  assertSrcSize(srcW, srcH, dstW, dstH)
  const scale = Math.min(dstW / srcW, dstH / srcH)
  const drawW = Math.max(1, Math.round(srcW * scale))
  const drawH = Math.max(1, Math.round(srcH * scale))
  return {
    drawW,
    drawH,
    offsetX: Math.round((dstW - drawW) / 2),
    offsetY: Math.round((dstH - drawH) / 2),
  }
}

/**
 * cover（等比裁剪）布局：填满目标尺寸，多余部分居中裁掉，
 * 返回在源图上的裁剪矩形（左上坐标 + 裁剪宽高）。
 */
export function computeCoverLayout(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { srcX: number; srcY: number; srcW: number; srcH: number } {
  assertSrcSize(srcW, srcH, dstW, dstH)
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const cropW = Math.min(srcW, Math.round(dstW / scale))
  const cropH = Math.min(srcH, Math.round(dstH / scale))
  return {
    srcX: Math.round((srcW - cropW) / 2),
    srcY: Math.round((srcH - cropH) / 2),
    srcW: cropW,
    srcH: cropH,
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

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-dimension.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
