import type { GridGenOptions } from './schema'

/** 支持的图案类型 */
export type Pattern = 'dots' | 'lines' | 'diagonal'

/** 解析图案：dots / lines / diagonal，留空默认 dots */
export function parsePattern(raw: string): Pattern {
  const v = raw.trim()
  if (v === '' || v === 'dots') return 'dots'
  if (v === 'lines') return 'lines'
  if (v === 'diagonal') return 'diagonal'
  throw new Error(`图案类型非法：${v}（须为 dots / lines / diagonal）`)
}

/** 解析间距：5–100，留空默认 30 */
export function parseSpacing(raw: string): number {
  const v = raw.trim()
  if (v === '') return 30
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`间距格式非法：${v}（须为数字）`)
  if (n < 5 || n > 100) throw new Error(`间距须在 5–100 之间（当前 ${v}）`)
  return n
}

/** 解析尺寸：1–2000，留空默认 400（宽）/ 300（高） */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 1 || n > 2000) throw new Error(`${name}须在 1–2000 之间（当前 ${v}）`)
  return n
}

/** 校验 #rgb / #rrggbb，统一小写并把 3 位展开成 6 位 */
export function parseHex(raw: string, name: string): string {
  const v = raw.trim()
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(v)
  if (!m) throw new Error(`${name}格式非法：${v}（须为 #rgb / #rrggbb）`)
  let h = m[1].toLowerCase()
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  return '#' + h
}

/** 点阵图案：在每个 spacing 格点上画小圆点 */
function buildDots(width: number, height: number, spacing: number, color: string): string {
  let out = ''
  const r = Math.max(1, Math.round(spacing / 10))
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      out += `  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" />\n`
    }
  }
  return out
}

/** 直线网格：水平 + 垂直细线 */
function buildLines(width: number, height: number, spacing: number, color: string): string {
  let out = ''
  for (let x = 0; x <= width; x += spacing) {
    out += `  <line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${color}" stroke-width="1" />\n`
  }
  for (let y = 0; y <= height; y += spacing) {
    out += `  <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${color}" stroke-width="1" />\n`
  }
  return out
}

/** 斜纹：45 度平行线，用对角线跨越画布 */
function buildDiagonal(width: number, height: number, spacing: number, color: string): string {
  let out = ''
  // 从左 / 上边出发，沿 -45 度方向画线，覆盖整个矩形
  const d = Math.max(width, height) * 2
  for (let i = -d; i < d; i += spacing) {
    out += `  <line x1="${i}" y1="0" x2="${i + height}" y2="${height}" stroke="${color}" stroke-width="1" />\n`
  }
  return out
}

/** 组装完整网格 SVG */
export function buildGridSvg(options: GridGenOptions): string {
  const pattern = parsePattern(options.pattern)
  const spacing = parseSpacing(options.spacing)
  const width = parseSize(options.width, '宽度', 400)
  const height = parseSize(options.height, '高度', 300)
  const fg = parseHex(options.fgColor, '前景色')
  const bg = parseHex(options.bgColor, '背景色')

  let body: string
  if (pattern === 'dots') body = buildDots(width, height, spacing, fg)
  else if (pattern === 'lines') body = buildLines(width, height, spacing, fg)
  else body = buildDiagonal(width, height, spacing, fg)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `  <rect width="${width}" height="${height}" fill="${bg}" />\n` +
    body +
    `</svg>`
  )
}

/** T3 toText 入口：返回 SVG 源码 */
export function transform(_input: { text: string }, options: GridGenOptions): string {
  return buildGridSvg(options)
}
