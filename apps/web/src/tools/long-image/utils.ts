/**
 * long-image 纯函数：参数解析、长图布局计算、排序、文件名构造。
 * 不触碰 DOM/Canvas/React，可 100% 单测。
 * 注意分层：禁止 import '../../lib/image'，Canvas 相关能力一律走 lib 层。
 */

export const DEFAULT_QUALITY = 85
export const DEFAULT_GAP = 0
export const GAP_LIMIT = 200
export const DEFAULT_BG_COLOR = '#ffffff'
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export type WidthMode = 'uniform' | 'original'
export type Align = 'left' | 'center' | 'right'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析间距 0–200；空串用默认 0 */
export function parseGap(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_GAP
  if (!/^\d+$/.test(t)) throw new Error(`间距无效：${raw}（须为 0–${GAP_LIMIT} 的整数）`)
  const g = Number(t)
  if (g < 0 || g > GAP_LIMIT) throw new Error(`间距超出范围：${raw}（须为 0–${GAP_LIMIT} 的整数）`)
  return g
}

/** 解析质量 1–100；空串用默认 85 */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
}

/** 解析背景色，须为 #rrggbb；空串用默认白色 */
export function parseBgColor(raw: string): string {
  const t = raw.trim()
  if (t === '') return DEFAULT_BG_COLOR
  if (!/^#[0-9a-fA-F]{6}$/.test(t)) throw new Error(`背景色无效：${raw}（须为 #rrggbb 格式）`)
  return `#${t.slice(1).toLowerCase()}`
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

/** PNG 为无损，质量参数不生效，返回 undefined 让调用方感知 */
export function effectiveQuality(
  format: 'jpeg' | 'png' | 'webp',
  quality: number,
): number | undefined {
  if (format === 'png') return undefined
  return quality / 100
}

export interface ImageSize {
  w: number
  h: number
}

export interface Placement extends ImageSize {
  x: number
  y: number
}

export interface LongLayout {
  width: number
  height: number
  placements: Placement[]
}

export interface LongLayoutOptions {
  widthMode: WidthMode
  gap: number
  align: Align
}

/**
 * 计算长图纵向拼接布局。
 * uniform：画布宽=最宽图，每张等比缩放到该宽（高度按比例，Math.round，最小 1）；
 * original：画布宽=最宽图，保持原尺寸，窄图按 align 确定 x 偏移。
 * gap 只出现在图与图之间（共 n-1 个），不加在首尾。
 * 空数组抛错；非法尺寸抛错。
 */
export function computeLongLayout(sizes: ImageSize[], opts: LongLayoutOptions): LongLayout {
  if (sizes.length === 0) throw new Error('至少需要 1 张图片才能计算布局')
  for (const s of sizes) {
    if (!Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) {
      throw new Error('图片尺寸无效')
    }
  }
  const { widthMode, gap, align } = opts
  const width = Math.max(...sizes.map((s) => s.w))
  const placements: Placement[] = []
  let y = 0
  sizes.forEach((s, i) => {
    let w = s.w
    let h = s.h
    if (widthMode === 'uniform') {
      w = width
      h = Math.max(1, Math.round((s.h * width) / s.w))
    }
    let x = 0
    if (widthMode === 'original') {
      if (align === 'center') x = Math.round((width - w) / 2)
      else if (align === 'right') x = width - w
      // left 时 x=0
    }
    placements.push({ x, y, w, h })
    y += h
    if (i < sizes.length - 1) y += gap
  })
  return { width, height: y, placements }
}

/**
 * 数组元素上移/下移（dir=-1 上移，dir=1 下移），返回新数组。
 * 索引越界或移动超出边界时原样返回（新数组，引用不同）。
 */
export function moveItem<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const next = [...arr]
  const target = index + dir
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) {
    return next
  }
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

/** 构造输出文件名：long-image-<yyyymmdd-hhmmss>.<ext> */
export function buildOutputFileName(format: 'jpeg' | 'png' | 'webp', now: Date): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `long-image-${date}-${time}.${ext}`
}
