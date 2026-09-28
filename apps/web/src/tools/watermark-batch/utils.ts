/**
 * watermark-batch 纯函数：参数解析、九宫格锚点、平铺步长/原点、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。Canvas 绘制（文本度量、旋转、平铺绘制）
 * 需要 2D 上下文，放在 Tool.tsx 里。
 */
import type { WatermarkBatchOptions, WatermarkBatchPosition } from './schema'

export const DEFAULT_FONT_SIZE_PERCENT = 6
export const MIN_FONT_SIZE_PERCENT = 2
export const MAX_FONT_SIZE_PERCENT = 20
export const DEFAULT_OPACITY = 50
export const MIN_OPACITY = 10
export const MAX_OPACITY = 100
export const DEFAULT_ANGLE = 0
export const MIN_ANGLE = -45
export const MAX_ANGLE = 45
export const DEFAULT_COLOR = '#ffffff'
export const DEFAULT_QUALITY = 80
export const MAX_TEXT_LENGTH = 100
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 批量总数上限 20（结果 Blob 常驻内存 + 解码位图峰值可控） */
export const MAX_FILES = 20
/** 最大并发 3（单张大图 Canvas 位图可达数百 MB，限并发保内存峰值） */
export const MAX_CONCURRENCY = 3

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析水印文字：去首尾空白，空抛错，超 100 字抛错 */
export function parseWatermarkText(raw: string): string {
  const text = raw.trim()
  if (text === '') throw new Error('水印文字不能为空')
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`水印文字过长：上限 ${MAX_TEXT_LENGTH} 字`)
  }
  return text
}

/** 解析字号百分比 2–20（相对图片短边）；空串用默认 6 */
export function parseFontSizePercent(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_FONT_SIZE_PERCENT
  if (!/^\d+$/.test(t)) {
    throw new Error(
      `字号无效：${raw}（须为 ${MIN_FONT_SIZE_PERCENT}–${MAX_FONT_SIZE_PERCENT} 的整数）`,
    )
  }
  const percent = Number(t)
  if (percent < MIN_FONT_SIZE_PERCENT || percent > MAX_FONT_SIZE_PERCENT) {
    throw new Error(
      `字号超出范围：${raw}（须为 ${MIN_FONT_SIZE_PERCENT}–${MAX_FONT_SIZE_PERCENT} 的整数）`,
    )
  }
  return percent
}

/** 解析不透明度 10–100；空串用默认 50 */
export function parseOpacity(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_OPACITY
  if (!/^\d+$/.test(t)) {
    throw new Error(`不透明度无效：${raw}（须为 ${MIN_OPACITY}–${MAX_OPACITY} 的整数）`)
  }
  const opacity = Number(t)
  if (opacity < MIN_OPACITY || opacity > MAX_OPACITY) {
    throw new Error(`不透明度超出范围：${raw}（须为 ${MIN_OPACITY}–${MAX_OPACITY} 的整数）`)
  }
  return opacity
}

/** 解析旋转角度 -45–45，可小数；空串用默认 0（不旋转） */
export function parseAngle(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_ANGLE
  if (!/^-?\d+(\.\d+)?$/.test(t)) {
    throw new Error(`角度无效：${raw}（须为 ${MIN_ANGLE}–${MAX_ANGLE} 的数字）`)
  }
  const angle = Number(t)
  if (angle < MIN_ANGLE || angle > MAX_ANGLE) {
    throw new Error(`角度超出范围：${raw}（须为 ${MIN_ANGLE}–${MAX_ANGLE}）`)
  }
  return angle
}

/** 解析颜色 #rrggbb；空串用默认 #ffffff，统一转小写 */
export function parseColor(raw: string): string {
  const t = raw.trim()
  if (t === '') return DEFAULT_COLOR
  if (!/^#[0-9a-fA-F]{6}$/.test(t)) {
    throw new Error(`颜色无效：${raw}（须为 #rrggbb 格式，如 #ffffff）`)
  }
  return t.toLowerCase()
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

/** 解析后的完整选项（批量处理前统一解析一次） */
export interface ParsedBatchOptions {
  text: string
  fontSizePercent: number
  color: string
  opacity: number
  angle: number
  tile: boolean
  position: WatermarkBatchPosition
  format: 'jpeg' | 'png' | 'webp'
  quality: number
}

/** 统一解析全部选项；任一非法即抛错，调用方展示为全局错误 */
export function parseOptions(raw: WatermarkBatchOptions): ParsedBatchOptions {
  return {
    text: parseWatermarkText(raw.text),
    fontSizePercent: parseFontSizePercent(raw.fontSize),
    color: parseColor(raw.color),
    opacity: parseOpacity(raw.opacity),
    angle: parseAngle(raw.angle),
    tile: raw.tile,
    position: raw.position,
    format: raw.format,
    quality: parseQuality(raw.quality),
  }
}

/** 九宫格锚点：返回文本绘制的对齐原点与对齐方式，调用方直接套用 */
export interface WatermarkAnchor {
  x: number
  y: number
  textAlign: 'left' | 'center' | 'right'
  textBaseline: 'top' | 'middle' | 'bottom'
}

/**
 * 九宫格位置→坐标：锚点落在图片九宫格交点上，
 * 配合 textAlign/textBaseline 使文本整体落在对应格内。
 */
export function watermarkPosition(
  imgW: number,
  imgH: number,
  position: WatermarkBatchPosition,
): WatermarkAnchor {
  if (!Number.isFinite(imgW) || !Number.isFinite(imgH) || imgW <= 0 || imgH <= 0) {
    throw new Error('图片尺寸无效')
  }
  const left = 0
  const centerX = imgW / 2
  const right = imgW
  const top = 0
  const centerY = imgH / 2
  const bottom = imgH
  switch (position) {
    case 'top-left':
      return { x: left, y: top, textAlign: 'left', textBaseline: 'top' }
    case 'top-center':
      return { x: centerX, y: top, textAlign: 'center', textBaseline: 'top' }
    case 'top-right':
      return { x: right, y: top, textAlign: 'right', textBaseline: 'top' }
    case 'middle-left':
      return { x: left, y: centerY, textAlign: 'left', textBaseline: 'middle' }
    case 'center':
      return { x: centerX, y: centerY, textAlign: 'center', textBaseline: 'middle' }
    case 'middle-right':
      return { x: right, y: centerY, textAlign: 'right', textBaseline: 'middle' }
    case 'bottom-left':
      return { x: left, y: bottom, textAlign: 'left', textBaseline: 'bottom' }
    case 'bottom-center':
      return { x: centerX, y: bottom, textAlign: 'center', textBaseline: 'bottom' }
    case 'bottom-right':
      return { x: right, y: bottom, textAlign: 'right', textBaseline: 'bottom' }
  }
}

/** 水印字号 px = 短边 × 百分比；字号自适应不同尺寸图片 */
export function fontPx(shortSide: number, percent: number): number {
  if (!Number.isFinite(shortSide) || shortSide <= 0) throw new Error('图片尺寸无效')
  if (
    !Number.isFinite(percent) ||
    percent < MIN_FONT_SIZE_PERCENT ||
    percent > MAX_FONT_SIZE_PERCENT
  ) {
    throw new Error('字号百分比无效')
  }
  return (shortSide * percent) / 100
}

/**
 * 平铺步长：横向 = 文本宽 + 一个字高间距，纵向 = 2.5 倍字高，
 * 使平铺疏密与字号成比例。
 */
export function tileSteps(textW: number, textH: number): { stepX: number; stepY: number } {
  if (!Number.isFinite(textW) || !Number.isFinite(textH) || textW <= 0 || textH <= 0) {
    throw new Error('水印文本尺寸无效')
  }
  return { stepX: textW + textH, stepY: textH * 2.5 }
}

/**
 * 平铺原点数组：从 (0,0) 起按步长铺满整图。
 * 步长或尺寸非法（<=0 / 非有限数）时返回空数组，调用方直接跳过绘制。
 */
export function tileOrigins(
  imgW: number,
  imgH: number,
  stepX: number,
  stepY: number,
): { x: number; y: number }[] {
  if (!Number.isFinite(imgW) || !Number.isFinite(imgH) || imgW <= 0 || imgH <= 0) return []
  if (!Number.isFinite(stepX) || !Number.isFinite(stepY) || stepX <= 0 || stepY <= 0) return []
  const origins: { x: number; y: number }[] = []
  for (let y = 0; y < imgH; y += stepY) {
    for (let x = 0; x < imgW; x += stepX) {
      origins.push({ x, y })
    }
  }
  return origins
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
  return `${base}-watermarked.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
