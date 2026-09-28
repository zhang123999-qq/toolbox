/**
 * filter 纯函数：滤镜预设表、预设兜底校验、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 滤镜预设 key：与 schema 的 preset enum 保持一致 */
export type FilterPreset =
  'none' | 'grayscale' | 'sepia' | 'invert' | 'warm' | 'cool' | 'fade' | 'vivid'

/** 预设定义：ctx.filter 字符串（Canvas 2D 滤镜语法） */
export interface FilterPresetDef {
  filter: string
}

/** 8 种滤镜预设纯表（键序即下拉展示顺序） */
export const FILTER_PRESETS: Record<FilterPreset, FilterPresetDef> = {
  none: { filter: 'none' },
  grayscale: { filter: 'grayscale(1)' },
  sepia: { filter: 'sepia(0.9)' },
  invert: { filter: 'invert(1)' },
  warm: { filter: 'sepia(0.35) saturate(1.4) contrast(1.05)' },
  cool: { filter: 'saturate(0.9) hue-rotate(-15deg) brightness(1.05)' },
  fade: { filter: 'contrast(0.85) brightness(1.1) saturate(0.7)' },
  vivid: { filter: 'saturate(1.6) contrast(1.15)' },
}

/** 下拉展示顺序（与 FILTER_PRESETS 键序一致） */
export const FILTER_PRESET_ORDER: readonly FilterPreset[] = [
  'none',
  'grayscale',
  'sepia',
  'invert',
  'warm',
  'cool',
  'fade',
  'vivid',
]

/** 兜底校验预设 key：zod enum 已约束，此处防脏数据穿透 */
export function parsePreset(raw: string): FilterPreset {
  if ((FILTER_PRESET_ORDER as readonly string[]).includes(raw)) return raw as FilterPreset
  throw new Error(`未知滤镜预设：${raw}`)
}

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

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-filter.${ext}`
}
