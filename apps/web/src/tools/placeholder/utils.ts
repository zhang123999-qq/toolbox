import type { PlaceholderInput, PlaceholderOptions } from './schema'

/** 尺寸边界 */
export const MIN_DIM = 1
export const MAX_DIM = 4000
/** 空输入默认尺寸 */
export const DEFAULT_W = 400
export const DEFAULT_H = 300

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 解析尺寸输入：支持 `300x200`、`300×200`（允许空白）。
 * 空 → 默认 400x300；格式非法或越界抛中文错。
 */
export function parseSize(raw: string): { w: number; h: number } {
  const s = raw.trim()
  if (s === '') return { w: DEFAULT_W, h: DEFAULT_H }
  const match = /^(\d+)\s*[x×]\s*(\d+)$/.exec(s)
  if (!match) {
    throw new Error('尺寸格式不正确，请使用如 300x200 或 300×200 的格式')
  }
  const w = Number(match[1])
  const h = Number(match[2])
  if (w < MIN_DIM || w > MAX_DIM || h < MIN_DIM || h > MAX_DIM) {
    throw new Error(`尺寸必须在 ${MIN_DIM} 到 ${MAX_DIM} 之间`)
  }
  return { w, h }
}

/**
 * 生成占位图 SVG：背景色填充 + 居中文字。
 * 文字默认显示尺寸，可用 customText 覆盖。
 */
export function buildPlaceholderSvg(input: PlaceholderInput, options: PlaceholderOptions): string {
  const { w, h } = parseSize(input.text)
  const bg = (options.bgColor ?? '').trim() || '#cccccc'
  const fg = (options.fgColor ?? '').trim() || '#666666'
  const label = (options.customText ?? '').trim() || `${w} × ${h}`
  const fontSize = Math.max(12, Math.round(Math.min(w, h) / 6))

  const body =
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
    `<text x="50%" y="50%" dy="0.36em" text-anchor="middle" ` +
    `font-family="Arial, sans-serif" font-size="${fontSize}" fill="${fg}">${escapeXml(label)}</text>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img" aria-label="placeholder">${body}</svg>`
  )
}
