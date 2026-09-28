import type { SvgGenInput, SvgGenOptions } from './schema'

/** 图案类型 */
export const PATTERNS = ['dots', 'lines', 'checker', 'waves', 'grid'] as const

/** 解析图案类型：默认 dots */
export function parsePattern(raw: string): (typeof PATTERNS)[number] {
  const v = raw.trim()
  if (v === '') return 'dots'
  if ((PATTERNS as readonly string[]).includes(v)) return v as (typeof PATTERNS)[number]
  throw new Error(`图案类型非法：${v}（可选 ${PATTERNS.join(' / ')}）`)
}

/** 解析尺寸：正整数，50–2000 */
export function parseSize(raw: string, name: string, def: number): number {
  const v = raw.trim()
  if (v === '') return def
  if (!/^\d+$/.test(v)) throw new Error(`${name}格式非法：${v}（须为正整数）`)
  const n = Number(v)
  if (n < 50 || n > 2000) throw new Error(`${name}须在 50–2000 之间（当前 ${v}）`)
  return n
}

/** 解析颜色：#rgb / #rrggbb，统一小写 */
export function parseColor(raw: string, name: string, def: string): string {
  const v = raw.trim()
  if (v === '') return def
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v.toLowerCase()
  throw new Error(`${name}格式非法：${v}（须为 #rgb / #rrggbb）`)
}

/** 解析间距：5–100 */
export function parseSpacing(raw: string): number {
  const v = raw.trim()
  if (v === '') return 20
  if (!/^\d+$/.test(v)) throw new Error(`间距格式非法：${v}（须为整数）`)
  const n = Number(v)
  if (n < 5 || n > 100) throw new Error(`间距须在 5–100 之间（当前 ${v}）`)
  return n
}

/** 点阵 */
function buildDots(w: number, h: number, fg: string, gap: number): string {
  const r = Math.max(1, gap / 4)
  const out: string[] = []
  for (let y = gap / 2; y < h; y += gap) {
    for (let x = gap / 2; x < w; x += gap) {
      out.push(
        `  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fg}"/>`,
      )
    }
  }
  return out.join('\n')
}

/** 水平条纹 */
function buildLines(w: number, h: number, fg: string, gap: number): string {
  const out: string[] = []
  for (let y = gap; y < h; y += gap) {
    out.push(`  <line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${fg}" stroke-width="2"/>`)
  }
  return out.join('\n')
}

/** 棋盘格 */
function buildChecker(w: number, h: number, fg: string, gap: number): string {
  const out: string[] = []
  let row = 0
  for (let y = 0; y < h; y += gap, row++) {
    let col = 0
    for (let x = 0; x < w; x += gap, col++) {
      if ((row + col) % 2 === 0) {
        out.push(`  <rect x="${x}" y="${y}" width="${gap}" height="${gap}" fill="${fg}"/>`)
      }
    }
  }
  return out.join('\n')
}

/** 波浪线：两条相位错开的正弦曲线 */
function buildWaves(w: number, h: number, fg: string, gap: number): string {
  const amp = gap / 2
  const waveLen = gap * 2
  const rows = Math.max(2, Math.floor(h / (gap * 1.5)))
  const out: string[] = []
  for (let r = 0; r < rows; r++) {
    const baseY = (h / (rows + 1)) * (r + 1)
    let d = `M 0 ${baseY.toFixed(1)}`
    for (let x = 0; x <= w; x += 4) {
      const y = baseY + amp * Math.sin((x / waveLen) * Math.PI * 2 + r)
      d += ` L ${x} ${y.toFixed(1)}`
    }
    out.push(`  <path d="${d}" fill="none" stroke="${fg}" stroke-width="2"/>`)
  }
  return out.join('\n')
}

/** 网格 */
function buildGrid(w: number, h: number, fg: string, gap: number): string {
  const out: string[] = []
  for (let x = gap; x < w; x += gap) {
    out.push(`  <line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${fg}" stroke-width="1"/>`)
  }
  for (let y = gap; y < h; y += gap) {
    out.push(`  <line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${fg}" stroke-width="1"/>`)
  }
  return out.join('\n')
}

/** 组装完整 SVG */
export function buildSvg(options: SvgGenOptions): string {
  const pattern = parsePattern(options.pattern)
  const w = parseSize(options.width, '宽度', 400)
  const h = parseSize(options.height, '高度', 300)
  const fg = parseColor(options.fgColor, '前景色', '#333333')
  const bg = parseColor(options.bgColor, '背景色', '#ffffff')
  const gap = parseSpacing(options.spacing)

  let body: string
  if (pattern === 'dots') body = buildDots(w, h, fg, gap)
  else if (pattern === 'lines') body = buildLines(w, h, fg, gap)
  else if (pattern === 'checker') body = buildChecker(w, h, fg, gap)
  else if (pattern === 'waves') body = buildWaves(w, h, fg, gap)
  else body = buildGrid(w, h, fg, gap)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
    `  <rect width="100%" height="100%" fill="${bg}"/>\n` +
    `${body}\n</svg>`
  )
}

/** T2 入口：text 不参与，图案由选项决定 */
export function transform(_input: SvgGenInput, options: SvgGenOptions): string {
  return buildSvg(options)
}
