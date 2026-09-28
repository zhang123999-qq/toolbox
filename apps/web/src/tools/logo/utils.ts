import type { LogoInput, LogoOptions } from './schema'

/** FNV-1a 32 位哈希常量 */
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const MULBERRY_INCREMENT = 0x6d2b79f5
const UINT32_RANGE = 4294967296

const STYLES = ['minimal', 'gradient', 'geometric', 'badge'] as const
const SHAPES = ['circle', 'square', 'none'] as const

/** 留空时使用的示例品牌名 */
export const DEFAULT_BRAND = 'Brand'

/** XML 特殊字符转义 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 字符串 → 32 位无符号整数 */
export function hashText(text: string): number {
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

/** mulberry32 种子 PRNG */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + MULBERRY_INCREMENT) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE
  }
}

/** 浏览器端随机种子（空品牌名时用） */
export function randomSeed(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return bytes.join('-')
}

function pickStyle(raw: string): (typeof STYLES)[number] {
  const s = raw.trim() || 'minimal'
  if (!(STYLES as readonly string[]).includes(s)) throw new Error(`未知的 Logo 样式：${s}`)
  return s as (typeof STYLES)[number]
}

function pickShape(raw: string): (typeof SHAPES)[number] {
  const s = raw.trim() || 'circle'
  if (!(SHAPES as readonly string[]).includes(s)) throw new Error(`未知的图标形状：${s}`)
  return s as (typeof SHAPES)[number]
}

/** 图标容器：根据 iconShape 产出背景形状 */
function container(shape: string, fill: string, stroke: string): string {
  if (shape === 'circle')
    return `<circle cx="48" cy="48" r="30" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`
  if (shape === 'square')
    return `<rect x="18" y="18" width="60" height="60" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`
  return ''
}

/** 容器内的图形记号 */
function glyph(style: string, brand: string, c1: string, c2: string): string {
  const letter = escapeXml(brand.charAt(0).toUpperCase())
  if (style === 'minimal') {
    // 线条图标：容器描边 + 内部一个小圆点 / 对勾
    return (
      `<circle cx="48" cy="48" r="12" fill="none" stroke="${c1}" stroke-width="3"/>` +
      `<circle cx="48" cy="48" r="4" fill="${c1}"/>`
    )
  }
  if (style === 'gradient') {
    // 渐变填充容器 + 白色首字母
    return `<text x="48" y="48" dy="0.36em" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${letter}</text>`
  }
  if (style === 'badge') {
    // 徽章：五角星
    return star(48, 48, 14, 6, '#ffffff')
  }
  // geometric：抽象几何组合（三角形 + 圆）
  const triangle = `<polygon points="48,30 64,62 32,62" fill="${c2}" opacity="0.9"/>`
  const circle = `<circle cx="48" cy="48" r="9" fill="#ffffff" opacity="0.85"/>`
  return triangle + circle
}

/** 五角星路径 */
function star(cx: number, cy: number, outer: number, inner: number, fill: string): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner
    const angle = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`
}

/**
 * 生成 Logo SVG：左侧图标 + 右侧品牌文字。
 * 空品牌名 → 使用默认示例品牌；空颜色 → 按品牌哈希随机配色。
 */
export function buildLogoSvg(input: LogoInput, options: LogoOptions, seed: string): string {
  const style = pickStyle(options.style)
  const shape = pickShape(options.iconShape)
  const brand = input.text.trim() || DEFAULT_BRAND

  const rand = mulberry32(hashText(brand === DEFAULT_BRAND ? seed : brand))
  const h = Math.floor(rand() * 360)
  const h2 = (h + 45 + Math.floor(rand() * 50)) % 360

  const c1 = (options.primaryColor ?? '').trim() || `hsl(${h}, 70%, 55%)`
  const c2 = (options.secondaryColor ?? '').trim() || `hsl(${h2}, 70%, 45%)`

  const gid = 'logo-g'
  let iconBg = 'none'
  let containerStroke = c1
  if (style === 'gradient') {
    iconBg = `url(#${gid})`
    containerStroke = 'none'
  } else if (style === 'badge') {
    iconBg = c1
    containerStroke = 'none'
  } else if (style === 'geometric') {
    iconBg = '#f1f5f9'
    containerStroke = 'none'
  }

  const defs = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`

  const body =
    defs +
    container(shape, iconBg, containerStroke) +
    glyph(style, brand, c1, c2) +
    `<text x="100" y="56" font-family="Arial, 'Helvetica Neue', sans-serif" font-size="32" font-weight="700" fill="#1f2937">${escapeXml(brand)}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96" role="img" aria-label="logo">${body}</svg>`
}
