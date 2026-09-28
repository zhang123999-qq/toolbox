/**
 * watermark 纯函数：参数解析、九宫格坐标、平铺原点、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 * 文本度量（measureText）需要 canvas，放在 Tool.tsx 里；
 * 纯布局函数只以 textW/textH 为入参。
 */

export const MIN_FONT_SIZE = 8
export const MAX_FONT_SIZE = 500
export const DEFAULT_FONT_SIZE = 48
export const DEFAULT_OPACITY = 50
export const DEFAULT_MARGIN = 24
export const DEFAULT_ANGLE = -30
export const DEFAULT_COLOR = '#ffffff'
export const DEFAULT_QUALITY = 80
export const MAX_MARGIN = 500
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析字号 8–500 整数；空串用默认 48 */
export function parseFontSize(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_FONT_SIZE
  if (!/^\d+$/.test(t)) throw new Error(`字号无效：${raw}（须为 8–500 的整数）`)
  const size = Number(t)
  if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
    throw new Error(`字号超出范围：${raw}（须为 8–500 的整数）`)
  }
  return size
}

/** 解析不透明度 0–100 整数；空串用默认 50 */
export function parseOpacity(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_OPACITY
  if (!/^\d+$/.test(t)) throw new Error(`不透明度无效：${raw}（须为 0–100 的整数）`)
  const opacity = Number(t)
  if (opacity < 0 || opacity > 100) {
    throw new Error(`不透明度超出范围：${raw}（须为 0–100 的整数）`)
  }
  return opacity
}

/** 解析旋转角度 -180–180，可小数；空串用默认 -30 */
export function parseAngle(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_ANGLE
  if (!/^-?\d+(\.\d+)?$/.test(t)) throw new Error(`角度无效：${raw}（须为 -180–180 的数字）`)
  const angle = Number(t)
  if (angle < -180 || angle > 180) {
    throw new Error(`角度超出范围：${raw}（须为 -180–180）`)
  }
  return angle
}

/** 解析边距 0–500 整数；空串用默认 24 */
export function parseMargin(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_MARGIN
  if (!/^\d+$/.test(t)) throw new Error(`边距无效：${raw}（须为 0–500 的整数）`)
  const margin = Number(t)
  if (margin > MAX_MARGIN) throw new Error(`边距过大：${raw}（上限 ${MAX_MARGIN}）`)
  return margin
}

/** 解析水印文字：去首尾空白，空抛错 */
export function parseWatermarkText(raw: string): string {
  const text = raw.trim()
  if (text === '') throw new Error('水印文字不能为空')
  return text
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

/**
 * 九宫格位置计算：返回水印文本的绘制原点坐标。
 * 调用方须设 textAlign='left'、textBaseline='top'，使 (x, y) 为文本左上角。
 */
export function computePosition(
  imgW: number,
  imgH: number,
  textW: number,
  textH: number,
  position: WatermarkPosition,
  margin: number,
): { x: number; y: number } {
  const left = margin
  const centerX = (imgW - textW) / 2
  const right = imgW - textW - margin
  const top = margin
  const centerY = (imgH - textH) / 2
  const bottom = imgH - textH - margin
  switch (position) {
    case 'top-left':
      return { x: left, y: top }
    case 'top-center':
      return { x: centerX, y: top }
    case 'top-right':
      return { x: right, y: top }
    case 'middle-left':
      return { x: left, y: centerY }
    case 'center':
      return { x: centerX, y: centerY }
    case 'middle-right':
      return { x: right, y: centerY }
    case 'bottom-left':
      return { x: left, y: bottom }
    case 'bottom-center':
      return { x: centerX, y: bottom }
    case 'bottom-right':
      return { x: right, y: bottom }
  }
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
