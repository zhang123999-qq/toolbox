/**
 * compress-compare（#470 图片压缩对比）纯函数：
 * 方案常量、方案开关解析、输出文件名、最佳方案判定。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

import type { MessageKey } from '../../i18n'

export interface CompressScheme {
  id: string
  /** i18n 文案键，形如 compressCompare.scheme.jpegQ90 */
  labelKey: MessageKey
  format: 'jpeg' | 'png' | 'webp'
  /** 导出质量 1–100；PNG 无损时为 undefined */
  quality: number | undefined
}

/** 6 组固定压缩方案（纯前端写死，保证可测），顺序即卡片展示顺序 */
export const SCHEMES: readonly CompressScheme[] = [
  { id: 'jpeg-q90', labelKey: 'compressCompare.scheme.jpegQ90', format: 'jpeg', quality: 90 },
  { id: 'jpeg-q70', labelKey: 'compressCompare.scheme.jpegQ70', format: 'jpeg', quality: 70 },
  { id: 'jpeg-q50', labelKey: 'compressCompare.scheme.jpegQ50', format: 'jpeg', quality: 50 },
  { id: 'webp-q80', labelKey: 'compressCompare.scheme.webpQ80', format: 'webp', quality: 80 },
  { id: 'webp-q60', labelKey: 'compressCompare.scheme.webpQ60', format: 'webp', quality: 60 },
  { id: 'png', labelKey: 'compressCompare.scheme.png', format: 'png', quality: undefined },
]

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 解析启用的方案 id：接受 string[] 或 Record<id, boolean>；
 * 过滤未知 id、去重、保持 SCHEMES 顺序；0 组时抛错（调用方展示提示不执行）。
 */
export function parseEnabledSchemes(raw: unknown): string[] {
  let ids: string[]
  if (Array.isArray(raw)) {
    ids = raw.filter((v): v is string => typeof v === 'string')
  } else if (raw !== null && typeof raw === 'object') {
    ids = Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k)
  } else {
    throw new Error('压缩方案参数无效')
  }
  const enabled = SCHEMES.filter((s) => ids.includes(s.id)).map((s) => s.id)
  if (enabled.length === 0) {
    throw new Error('至少启用 1 组压缩方案')
  }
  return enabled
}

/** 解析并返回启用的方案对象（SCHEMES 顺序）；0 组时抛错 */
export function enabledSchemes(raw: unknown): CompressScheme[] {
  const ids = parseEnabledSchemes(raw)
  return SCHEMES.filter((s) => ids.includes(s.id))
}

/** 方案转导出 MIME */
export function schemeToMime(scheme: CompressScheme): string {
  if (scheme.format === 'jpeg') return 'image/jpeg'
  if (scheme.format === 'webp') return 'image/webp'
  return 'image/png'
}

/** 方案质量转 canvas 导出 quality 参数（0–1）；PNG 无损返回 undefined */
export function schemeQualityParam(scheme: CompressScheme): number | undefined {
  return scheme.quality === undefined ? undefined : scheme.quality / 100
}

/**
 * 构造输出文件名：原名 + 方案后缀，如 photo-q70.jpg、photo-q80.webp、photo-png.png
 */
export function buildOutputFileName(originalName: string, scheme: CompressScheme): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  const ext = scheme.format === 'jpeg' ? 'jpg' : scheme.format
  const suffix = scheme.quality === undefined ? 'png' : `q${scheme.quality}`
  return `${base}-${suffix}.${ext}`
}

/** 压缩率文本：new/orig，保留 1 位小数 */
export function compressionRatioText(origBytes: number, newBytes: number): string {
  if (origBytes <= 0) return '—'
  const ratio = (newBytes / origBytes) * 100
  return `${ratio.toFixed(1)}%`
}

/** 体积最小的方案 id；空数组返回 null（调用方保证非空） */
export function bestSchemeId(sizes: ReadonlyArray<{ id: string; size: number }>): string | null {
  if (sizes.length === 0) return null
  let best = sizes[0]
  for (const s of sizes) {
    if (s.size < best.size) best = s
  }
  return best.id
}
