import { formatHex, oklch, parse } from 'culori'
import type { Translate } from '../../i18n'
import { inputSchema, optionsSchema } from './schema'
import type { ColorPaletteInput, ColorPaletteOptions } from './schema'

/** 颜色数量上限：再多就不是「调色板」而是渐变条了 */
export const MAX_COLORS = 20

/** 配色模式（select 的取值即标识串，展示给用户看，属通用色彩学术语） */
export const MODES = [
  'random',
  'monochromatic',
  'analogous',
  'complementary',
  'triadic',
  'split-complementary',
  'tetradic',
] as const
export type PaletteMode = (typeof MODES)[number]

/** Oklch 基础色（h 已归一，无彩色时 h = 0） */
export interface OklchBase {
  readonly l: number
  readonly c: number
  readonly h: number
}

/**
 * 解析基础色：支持 #rgb / #rrggbb / CSS 颜色名；留空返回 null（调用方随机生成）。
 * 色彩空间转换经 culori 在 Oklch 完成；非法输入抛双语错误。
 */
export function parseBaseColor(text: string, t: Translate): OklchBase | null {
  const raw = text.trim()
  if (raw === '') return null
  const color = parse(raw)
  if (color === undefined) {
    throw new Error(t('colorPalette.error.invalidColor', { value: raw }))
  }
  const converted = oklch(color)
  return { l: converted.l, c: converted.c, h: converted.h ?? 0 }
}

/** 各模式的色相锚点：相对基础色相的偏移角度（度） */
export function anchorOffsets(mode: PaletteMode): readonly number[] {
  switch (mode) {
    case 'random':
      return [0]
    case 'monochromatic':
      return [0]
    case 'analogous':
      return [-30, 0, 30]
    case 'complementary':
      return [0, 180]
    case 'triadic':
      return [0, 120, 240]
    case 'split-complementary':
      return [0, 150, 210]
    case 'tetradic':
      return [0, 90, 180, 270]
  }
}

/** 色相归一化到 [0, 360) */
export function normalizeHue(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/** 随机基础色：中等明度、自然彩度、随机色相 */
export function randomBase(rand: () => number): OklchBase {
  return { l: 0.55 + rand() * 0.2, c: 0.1 + rand() * 0.1, h: Math.floor(rand() * 360) }
}

/** 解析配色模式：非法取值直接报错，不静默兜底 */
export function parseMode(raw: string, t: Translate): PaletteMode {
  if ((MODES as readonly string[]).includes(raw)) return raw as PaletteMode
  throw new Error(t('colorPalette.error.invalidMode', { value: raw }))
}

/** 解析颜色数量：须为 1–MAX_COLORS 的整数 */
export function parseCount(raw: string, t: Translate): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error(t('colorPalette.error.invalidCount', { value: raw, max: String(MAX_COLORS) }))
  }
  const count = Number(value)
  if (count < 1 || count > MAX_COLORS) {
    throw new Error(t('colorPalette.error.invalidCount', { value: raw, max: String(MAX_COLORS) }))
  }
  return count
}

/**
 * 生成调色板（纯函数）：锚点色相按序轮转，明度沿渐变排布；
 * random 模式每色取随机色相与随机彩度；monochromatic 模式固定色相、明度拉开 0.3→0.85。
 * 输出恒为合法 #rrggbb（culori 的 formatHex 会把越界通道钳制进 sRGB）。
 */
export function generatePalette(
  base: OklchBase,
  mode: PaletteMode,
  count: number,
  rand: () => number = Math.random,
): string[] {
  const offsets = anchorOffsets(mode)
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    const offset = offsets[i % offsets.length]
    const hue = mode === 'random' ? Math.floor(rand() * 360) : normalizeHue(base.h + offset)
    const position = count === 1 ? 0.5 : i / (count - 1)
    const lightness = mode === 'monochromatic' ? 0.3 + position * 0.55 : 0.45 + position * 0.3
    const chroma = mode === 'random' ? 0.08 + rand() * 0.12 : Math.max(base.c, 0.06)
    colors.push(formatHex({ mode: 'oklch', l: lightness, c: chroma, h: hue }))
  }
  return colors
}

/** T2 同步入口：每行一个 #rrggbb；基础色留空则随机 */
export function transform(
  input: ColorPaletteInput,
  options: ColorPaletteOptions,
  t: Translate,
  rand: () => number = Math.random,
): string {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  const mode = parseMode(parsedOptions.mode, t)
  const count = parseCount(parsedOptions.count, t)
  const base = parseBaseColor(parsedInput.text, t) ?? randomBase(rand)
  return generatePalette(base, mode, count, rand).join('\n')
}
