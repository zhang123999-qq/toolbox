import type { GradientGenInput, GradientGenOptions } from './schema'

/** 支持的渐变类型 */
export const GRADIENT_TYPES = ['linear', 'radial', 'conic'] as const
/** 径向渐变形状 */
export const RADIAL_SHAPES = ['circle', 'ellipse'] as const

/** FNV-1a 32 位哈希：把种子文本变成 PRNG 种子 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32：小巧可复现的 PRNG */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 解析颜色列表：每行一个 #rrggbb，忽略空行；统一转小写。
 * 全部为空（留空）返回 null，调用方随机生成；任一行非法抛中文错。
 */
export function parseColorList(text: string): string[] | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length === 0) return null
  const colors: string[] = []
  for (const line of lines) {
    if (!/^#[0-9a-fA-F]{6}$/.test(line)) {
      throw new Error(`颜色格式非法：${line}（须为 #rrggbb，如 #3b82f6）`)
    }
    colors.push(line.toLowerCase())
  }
  if (colors.length < 2) {
    throw new Error('渐变至少需要 2 个颜色')
  }
  return colors
}

/** HSL（h:0-360, s/l:0-100）转 #rrggbb */
export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const to = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** 随机和谐配色：2–4 色，沿色相环均匀铺开，固定中等饱和/明度 */
export function randomColors(rand: () => number): string[] {
  const count = 2 + Math.floor(rand() * 3) // 2,3,4
  const baseHue = rand() * 360
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (360 / count) * i + rand() * 24) % 360
    colors.push(hslToHex(hue, 68 + rand() * 12, 52 + rand() * 12))
  }
  return colors
}

/** 解析渐变类型：默认 linear，非法抛错 */
export function parseType(raw: string): 'linear' | 'radial' | 'conic' {
  const v = raw.trim()
  if (v === '') return 'linear'
  if ((GRADIENT_TYPES as readonly string[]).includes(v)) return v as 'linear' | 'radial' | 'conic'
  throw new Error(`渐变类型非法：${v}（可选 linear / radial / conic）`)
}

/** 解析角度：默认 135，须 0–360，仅 linear 使用 */
export function parseAngle(raw: string): number {
  const v = raw.trim()
  if (v === '') return 135
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`角度格式非法：${v}（须为数字）`)
  if (n < 0 || n > 360) throw new Error(`角度须在 0–360 之间（当前 ${v}）`)
  return n
}

/** 解析径向形状：默认 ellipse，仅 radial 使用 */
export function parseShape(raw: string): 'circle' | 'ellipse' {
  const v = raw.trim()
  if (v === '') return 'ellipse'
  if ((RADIAL_SHAPES as readonly string[]).includes(v)) return v as 'circle' | 'ellipse'
  throw new Error(`径向形状非法：${v}（可选 circle / ellipse）`)
}

/** 组装 gradient 函数体 */
export function buildGradient(
  colors: string[],
  type: 'linear' | 'radial' | 'conic',
  angle: number,
  shape: 'circle' | 'ellipse',
): string {
  const stops = colors.join(', ')
  if (type === 'linear') return `linear-gradient(${angle}deg, ${stops})`
  if (type === 'radial') return `radial-gradient(${shape}, ${stops})`
  return `conic-gradient(from 0deg, ${stops})`
}

/** T2 入口：返回完整 CSS（含 .gradient 包装） */
export function transform(input: GradientGenInput, options: GradientGenOptions, salt = 0): string {
  const type = parseType(options.type)
  const angle = parseAngle(options.angle)
  const shape = parseShape(options.shape)
  const rand = mulberry32(hashSeed(JSON.stringify({ text: input.text, salt, type, angle, shape })))
  const colors = parseColorList(input.text) ?? randomColors(rand)
  return `.gradient {\n  background: ${buildGradient(colors, type, angle, shape)};\n}`
}
