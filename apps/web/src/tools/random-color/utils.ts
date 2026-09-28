import { formatHex } from 'culori'
import { inputSchema, optionsSchema } from './schema'
import type { RandomColorInput, RandomColorOptions } from './schema'

/** 数量上限：再多就失去「随手取色」的意义 */
export const MAX_COUNT = 50

/** 支持的输出格式 */
export const FORMATS = ['hex', 'rgb', 'hsl'] as const
export type ColorFormat = (typeof FORMATS)[number]

/** Oklch 颜色对象（culori 中间表示） */
export interface OklchColor {
  readonly mode: 'oklch'
  readonly l: number
  readonly c: number
  readonly h: number
}

/** 基于 Web Crypto 的 [0,1) 均匀随机数（禁 Math.random） */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 0x100000000
}

/** [0, maxExclusive) 随机整数 */
export function randInt(maxExclusive: number, rand: () => number = cryptoRandom): number {
  return Math.floor(rand() * maxExclusive)
}

/** 解析数量：空串默认 1；须为 1–MAX_COUNT 的整数，否则抛中文错 */
export function parseCount(raw: string | undefined): number {
  const value = (raw ?? '').trim()
  if (value === '') return 1
  if (!/^\d+$/.test(value)) {
    throw new Error(`数量必须为 1 到 ${MAX_COUNT} 之间的整数`)
  }
  const count = Number(value)
  if (count < 1 || count > MAX_COUNT) {
    throw new Error(`数量必须为 1 到 ${MAX_COUNT} 之间的整数`)
  }
  return count
}

/** 解析输出格式：空串默认 hex；非法取值抛中文错 */
export function parseFormat(raw: string | undefined): ColorFormat {
  const value = (raw ?? '').trim()
  if (value === '') return 'hex'
  if ((FORMATS as readonly string[]).includes(value)) return value as ColorFormat
  throw new Error('不支持的颜色格式，可选 hex / rgb / hsl')
}

/**
 * 生成一个随机颜色：随机色相，中等明度（0.55–0.7）与中等彩度（0.08–0.16），
 * 落在 Oklch 空间；越界 sRGB 通道由 culori 钳制。
 */
export function randomColor(rand: () => number = cryptoRandom): OklchColor {
  return {
    mode: 'oklch',
    h: rand() * 360,
    l: 0.55 + rand() * 0.15,
    c: 0.08 + rand() * 0.08,
  }
}

/** #rrggbb → {r,g,b} 0-255（纯函数，不依赖 culori 类型缺失的 API） */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** rgb(0-255) → hsl(h:0-360, s:0-100, l:0-100) */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** 把 Oklch 颜色按指定格式输出为字符串（hex 经 culori formatHex，rgb/hsl 手动换算） */
export function formatColor(color: OklchColor, format: ColorFormat): string {
  if (format === 'hex') return formatHex(color)
  const hex = formatHex(color)
  const { r, g, b } = hexToRgb(hex)
  if (format === 'rgb') return `rgb(${r}, ${g}, ${b})`
  const hsl = rgbToHsl(r, g, b)
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
}

/** T2 入口：每行一个颜色值；无实质输入，空 text 也照常随机生成 */
export function transform(input: RandomColorInput, options: RandomColorOptions): string {
  inputSchema.parse(input)
  optionsSchema.parse(options)
  const count = parseCount(options.count)
  const format = parseFormat(options.format)
  const lines: string[] = []
  for (let i = 0; i < count; i++) {
    lines.push(formatColor(randomColor(), format))
  }
  return lines.join('\n')
}
