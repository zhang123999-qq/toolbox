import type { FaviconInput, FaviconOptions } from './schema'

const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const MULBERRY_INCREMENT = 0x6d2b79f5
const UINT32_RANGE = 4294967296

const STYLES = ['letter', 'gradient', 'geometric'] as const

export const MIN_SIZE = 16
export const MAX_SIZE = 256
export const DEFAULT_SIZE = 64

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 字符串 → 32 位无符号整数（FNV-1a） */
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

/** 浏览器端随机种子 */
export function randomSeed(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return bytes.join('-')
}

/** 解析尺寸：空 → 默认；越界 / 非整数抛中文错 */
export function parseSize(raw: string): number {
  const s = raw.trim()
  if (s === '') return DEFAULT_SIZE
  const value = Number(s)
  if (!Number.isInteger(value) || value < MIN_SIZE || value > MAX_SIZE) {
    throw new Error(`尺寸必须是 ${MIN_SIZE} 到 ${MAX_SIZE} 之间的整数`)
  }
  return value
}

function parseStyle(raw: string): (typeof STYLES)[number] {
  const s = raw.trim() || 'letter'
  if (!(STYLES as readonly string[]).includes(s)) throw new Error(`未知的 favicon 样式：${s}`)
  return s as (typeof STYLES)[number]
}

/** 取首字符：中文取首字，其余取首字符大写 */
export function initialOf(text: string): string {
  const t = text.trim()
  const ch = t.charAt(0)
  if (/[\u4e00-\u9fff]/.test(ch)) return ch
  return ch.toUpperCase()
}

function randomLetter(rand: () => number): string {
  return String.fromCharCode(65 + Math.floor(rand() * 26))
}

/**
 * 生成 favicon SVG 字符串。
 * - letter：纯色背景 + 首字母
 * - gradient：渐变背景 + 首字母
 * - geometric：几何图案
 */
export function buildFaviconSvg(
  input: FaviconInput,
  options: FaviconOptions,
  seed: string,
): string {
  const size = parseSize(options.size)
  const style = parseStyle(options.style)
  const text = input.text.trim()

  const seedNum = text === '' ? hashText(seed) : hashText(text)
  const rand = mulberry32(seedNum)
  const h1 = Math.floor(rand() * 360)
  const h2 = (h1 + 45 + Math.floor(rand() * 50)) % 360

  const bgColor = (options.bgColor ?? '').trim() || `hsl(${h1}, 70%, 55%)`
  const fgColor = (options.fgColor ?? '').trim() || '#ffffff'
  const letter = text === '' ? randomLetter(rand) : initialOf(text)

  const fontSize = Math.round(size * 0.55)
  const textEl =
    `<text x="50%" y="50%" dy="0.36em" text-anchor="middle" ` +
    `font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" ` +
    `fill="${fgColor}">${escapeXml(letter)}</text>`

  let body: string
  if (style === 'letter') {
    body =
      `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="${bgColor}"/>` +
      textEl
  } else if (style === 'gradient') {
    body =
      `<defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${bgColor}"/>` +
      `<stop offset="1" stop-color="hsl(${h2}, 70%, 45%)"/></linearGradient></defs>` +
      `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#fg)"/>` +
      textEl
  } else {
    // geometric：纯色底 + 两个半透明几何块
    const r = size * 0.3
    const tri = `<polygon points="${size / 2},${size * 0.15} ${size * 0.85},${size * 0.8} ${size * 0.15},${size * 0.8}" fill="${fgColor}" opacity="0.85"/>`
    const cir = `<circle cx="${size * 0.68}" cy="${size * 0.32}" r="${r * 0.4}" fill="#ffffff" opacity="0.6"/>`
    body = `<rect width="${size}" height="${size}" fill="${bgColor}"/>` + tri + cir
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" role="img" aria-label="favicon">${body}</svg>`
  )
}
