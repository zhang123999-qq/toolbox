import { formatHex, oklch, parse, rgb, type Oklch } from 'culori'

/** sRGB 通道（0..1） */
export interface Rgb01 {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** 解析后的颜色：规范 hex + sRGB 通道 + Oklch（供明度调整复用） */
export interface ParsedColor extends Rgb01 {
  readonly hex: string
  readonly oklch: Oklch
}

/**
 * 解析用户输入的颜色（#rgb / #rrggbb / 颜色名 / rgb() …），返回规范形式。
 * 非法输入抛中文错。
 */
export function parseColor(input: string): ParsedColor {
  const raw = input.trim()
  const color = parse(raw)
  if (color === undefined) throw new Error(`无法解析的颜色：${raw === '' ? '（空）' : raw}`)
  const c = rgb(color)
  return { hex: formatHex(oklch(color)), r: c.r, g: c.g, b: c.b, oklch: oklch(color) }
}

/** sRGB 通道转线性光 */
function linearize(v: number): number {
  const clamped = Math.min(1, Math.max(0, v))
  return clamped <= 0.03928 ? clamped / 12.92 : ((clamped + 0.055) / 1.055) ** 2.4
}

/** WCAG 相对亮度 */
export function relativeLuminance(color: Rgb01): number {
  return (
    0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b)
  )
}

/** WCAG 对比度（保留 2 位小数） */
export function contrastRatioOf(a: Rgb01, b: Rgb01): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

export interface WcagRating {
  /** 正文 AA（≥ 4.5） */
  readonly normalAA: boolean
  /** 正文 AAA（≥ 7） */
  readonly normalAAA: boolean
  /** 大文本 AA（≥ 3） */
  readonly largeAA: boolean
  /** 大文本 AAA（≥ 4.5） */
  readonly largeAAA: boolean
  /** UI 组件 / 图形（≥ 3） */
  readonly ui: boolean
}

/** 按 WCAG 2.x 阈值判定各级别是否通过 */
export function wcagRating(ratio: number): WcagRating {
  return {
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
    ui: ratio >= 3,
  }
}

export interface ContrastResult {
  readonly fg: string
  readonly bg: string
  readonly ratio: number
  readonly rating: WcagRating
}

/** 前景 / 背景对比度检测主入口 */
export function checkContrast(fgInput: string, bgInput: string): ContrastResult {
  const fg = parseColor(fgInput)
  const bg = parseColor(bgInput)
  const ratio = contrastRatioOf(fg, bg)
  return { fg: fg.hex, bg: bg.hex, ratio, rating: wcagRating(ratio) }
}

export interface FixSuggestion {
  readonly hex: string
  readonly ratio: number
}

/**
 * 配色修复建议：沿 Oklch 明度轴调整前景色（先尝试拉开与背景差距的方向，
 * 再试反方向），步长 0.02，最多 50 步，找到首个达到 target 的颜色。
 * 已达标则返回原色；两方向都找不到返回 null。
 */
export function suggestFix(fgInput: string, bgInput: string, target = 4.5): FixSuggestion | null {
  const fg = parseColor(fgInput)
  const bg = parseColor(bgInput)
  const current = contrastRatioOf(fg, bg)
  if (current >= target) return { hex: fg.hex, ratio: current }

  const directions = relativeLuminance(fg) >= relativeLuminance(bg) ? [1, -1] : [-1, 1]
  for (const dir of directions) {
    for (let step = 1; step <= 50; step++) {
      const l = Math.min(1, Math.max(0, fg.oklch.l + dir * step * 0.02))
      const hex = formatHex({ ...fg.oklch, l })
      const ratio = contrastRatioOf(rgb({ ...fg.oklch, l }), bg)
      if (ratio >= target) return { hex, ratio }
      if (l === 0 || l === 1) break
    }
  }
  return null
}
