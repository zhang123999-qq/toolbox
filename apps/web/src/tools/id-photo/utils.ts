/**
 * id-photo 纯函数：规格解析、单位换算、裁剪框/拼版计算、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */
import type { BgColorMode, LayoutKey, SpecKey } from './schema'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 固定规格表（名称走 i18n，utils 只存 key 与毫米尺寸） */
export const SPEC_PRESETS: { key: Exclude<SpecKey, 'custom'>; wMm: number; hMm: number }[] = [
  { key: '1inch', wMm: 25, hMm: 35 },
  { key: '2inch', wMm: 35, hMm: 49 },
  { key: 'small2inch', wMm: 35, hMm: 45 },
  { key: 'large1inch', wMm: 33, hMm: 48 },
]

/** DPI 选项 */
export const DPI_OPTIONS = [150, 300, 600] as const
export const DEFAULT_DPI = 300

/** 缩放默认 100% */
export const DEFAULT_SCALE = 100

/** 自定义规格毫米上限（防止误填超大纸张导致内存爆炸） */
export const MAX_CUSTOM_MM = 500

/** 拼版照片间距（毫米） */
export const LAYOUT_GAP_MM = 2

/** 固定底色 */
export const BG_COLORS = {
  red: '#ff0000',
  blue: '#3584e4',
  white: '#ffffff',
} as const

/** 纸张尺寸（毫米）：5寸相纸 127×89mm；A4 210×297mm */
const PAPER_MM: Record<Exclude<LayoutKey, 'single'>, { wMm: number; hMm: number }> = {
  '5inch': { wMm: 127, hMm: 89 },
  a4: { wMm: 210, hMm: 297 },
}

/** 提取错误消息（纯函数）；空消息兜底，避免界面错误栏渲染空字符串 */
export function errorMessage(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  return m || '处理失败'
}

/** 毫米转像素：mm / 25.4 * dpi，四舍五入 */
export function mmToPx(mm: number, dpi: number): number {
  if (!Number.isFinite(mm) || !Number.isFinite(dpi) || mm <= 0 || dpi <= 0) {
    throw new Error('毫米或 DPI 无效')
  }
  return Math.round((mm / 25.4) * dpi)
}

/** 解析 DPI：空串用默认 300；仅接受 150 / 300 / 600 */
export function parseDpi(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_DPI
  const d = Number(t)
  if (!Number.isInteger(d) || !(DPI_OPTIONS as readonly number[]).includes(d)) {
    throw new Error(`DPI 无效：${raw}（可选 150 / 300 / 600）`)
  }
  return d
}

/** 解析缩放 50–200 的整数；空串用默认 100 */
export function parseScale(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_SCALE
  if (!/^\d+$/.test(t)) throw new Error(`缩放无效：${raw}（须为 50–200 的整数）`)
  const s = Number(t)
  if (s < 50 || s > 200) throw new Error(`缩放超出范围：${raw}（须为 50–200 的整数）`)
  return s
}

/** 解析自定义规格毫米数：正数，上限 500mm */
export function parseCustomMm(raw: string, label: string): number {
  const t = raw.trim()
  if (t === '') throw new Error(`请填写自定义${label}（毫米）`)
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error(`自定义${label}无效：${raw}`)
  const v = Number(t)
  if (v <= 0 || v > MAX_CUSTOM_MM) {
    throw new Error(`自定义${label}超出范围：${raw}（须为 0–${MAX_CUSTOM_MM} 毫米）`)
  }
  return v
}

/** 解析规格为毫米宽高：预设查表，custom 解析用户输入 */
export function resolveSpec(
  spec: SpecKey,
  customW: string,
  customH: string,
): { wMm: number; hMm: number } {
  if (spec === 'custom') {
    return { wMm: parseCustomMm(customW, '宽'), hMm: parseCustomMm(customH, '高') }
  }
  const preset = SPEC_PRESETS.find((p) => p.key === spec)
  if (!preset) throw new Error(`未知规格：${spec}`)
  return { wMm: preset.wMm, hMm: preset.hMm }
}

/** 解析底色为 CSS 颜色：预设查表，custom 校验 #rgb / #rrggbb */
export function resolveBgColor(mode: BgColorMode, customBg: string): string {
  if (mode !== 'custom') {
    const c = BG_COLORS[mode]
    if (!c) throw new Error(`未知底色：${mode}`)
    return c
  }
  const t = customBg.trim()
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) {
    throw new Error(`自定义底色无效：${customBg}`)
  }
  return t
}

/** 取排版纸张毫米尺寸；单张返回 null（调用方不拼版） */
export function paperMmForLayout(layout: LayoutKey): { wMm: number; hMm: number } | null {
  if (layout === 'single') return null
  return PAPER_MM[layout]
}

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 按目标宽高比计算居中裁剪框，再按 scale 调整。
 * scale > 100% 时裁剪框缩小（人像放大）；scale < 100% 时裁剪框放大，
 * 但不得超过原图（clamp）。返回原图坐标系下的矩形。
 */
export function computeCropRect(
  srcW: number,
  srcH: number,
  targetRatio: number,
  scale: number,
): CropRect {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (!Number.isFinite(targetRatio) || targetRatio <= 0) {
    throw new Error('目标宽高比无效')
  }
  if (!Number.isInteger(scale) || scale < 50 || scale > 200) {
    throw new Error('缩放无效：须为 50–200 的整数')
  }
  const srcRatio = srcW / srcH
  let w: number
  let h: number
  if (srcRatio >= targetRatio) {
    w = srcH * targetRatio
  } else {
    w = srcW
  }
  const factor = 100 / scale
  w = Math.min(srcW, w * factor)
  h = w / targetRatio
  if (h > srcH) {
    h = srcH
    w = h * targetRatio
  }
  return { x: (srcW - w) / 2, y: (srcH - h) / 2, w, h }
}

export interface LayoutPosition {
  x: number
  y: number
}

export interface LayoutResult {
  cols: number
  rows: number
  positions: LayoutPosition[]
}

/**
 * 计算拼版：纸张内按 gapPx 间距铺满照片。
 * 某方向排不下时该方向计数为 0（调用方据此报错「照片大于纸张」）。
 */
export function computeLayout(
  paperWpx: number,
  paperHpx: number,
  photoWpx: number,
  photoHpx: number,
  gapPx: number,
): LayoutResult {
  const gap = Number.isFinite(gapPx) && gapPx > 0 ? gapPx : 0
  const dims = [paperWpx, paperHpx, photoWpx, photoHpx]
  if (!dims.every((v) => Number.isFinite(v) && v > 0)) {
    return { cols: 0, rows: 0, positions: [] }
  }
  const cols = Math.floor((paperWpx + gap) / (photoWpx + gap))
  const rows = Math.floor((paperHpx + gap) / (photoHpx + gap))
  const positions: LayoutPosition[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({ x: c * (photoWpx + gap), y: r * (photoHpx + gap) })
    }
  }
  return { cols, rows, positions }
}

/** 构造输出文件名：原名-id-photo-<规格>[-layout].jpg */
export function buildOutputFileName(
  originalName: string,
  spec: SpecKey,
  layout: LayoutKey,
): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'photo'
  const suffix = layout === 'single' ? '' : '-layout'
  return `${base}-id-photo-${spec}${suffix}.jpg`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
