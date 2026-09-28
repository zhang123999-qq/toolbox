import { formatHex, oklch, parse } from 'culori'
import { inputSchema, optionsSchema } from './schema'
import type { PaletteInput, PaletteOptions } from './schema'

export const MAX_COLORS = 20

/** 配色模式 */
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

/** 导出格式 */
export const FORMATS = ['css', 'scss', 'json', 'tailwind'] as const
export type PaletteFormat = (typeof FORMATS)[number]

export interface OklchBase {
  readonly l: number
  readonly c: number
  readonly h: number
}

/** 基于 Web Crypto 的 [0,1) 随机数 */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 0x100000000
}

/** 解析基础色：留空返回 null（调用方随机生成）；非法颜色抛中文错 */
export function parseBaseColor(text: string): OklchBase | null {
  const raw = text.trim()
  if (raw === '') return null
  const color = parse(raw)
  if (color === undefined) throw new Error(`无法解析的颜色：${raw}`)
  const converted = oklch(color)
  return { l: converted.l, c: converted.c, h: converted.h ?? 0 }
}

/** 各模式相对基础色相的锚点偏移（度） */
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

/** 色相归一化到 [0,360) */
export function normalizeHue(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/** 随机基础色：中等明度、自然彩度、随机色相 */
export function randomBase(rand: () => number = cryptoRandom): OklchBase {
  return { l: 0.55 + rand() * 0.2, c: 0.1 + rand() * 0.1, h: Math.floor(rand() * 360) }
}

/** 解析配色模式：空串默认 random；非法抛中文错 */
export function parseMode(raw: string | undefined): PaletteMode {
  const value = (raw ?? '').trim()
  if (value === '') return 'random'
  if ((MODES as readonly string[]).includes(value)) return value as PaletteMode
  throw new Error(`未知的配色模式：${value}`)
}

/** 解析数量：空串默认 5；1–MAX_COLORS 整数，否则抛中文错 */
export function parseCount(raw: string | undefined): number {
  const value = (raw ?? '').trim()
  if (value === '') return 5
  if (!/^\d+$/.test(value)) throw new Error(`颜色数量必须为 1 到 ${MAX_COLORS} 之间的整数`)
  const count = Number(value)
  if (count < 1 || count > MAX_COLORS)
    throw new Error(`颜色数量必须为 1 到 ${MAX_COLORS} 之间的整数`)
  return count
}

/** 解析导出格式：空串默认 css；非法抛中文错 */
export function parseFormat(raw: string | undefined): PaletteFormat {
  const value = (raw ?? '').trim()
  if (value === '') return 'css'
  if ((FORMATS as readonly string[]).includes(value)) return value as PaletteFormat
  throw new Error('不支持的导出格式，可选 css / scss / json / tailwind')
}

/** 生成调色板（hex 字符串数组） */
export function generatePalette(
  base: OklchBase,
  mode: PaletteMode,
  count: number,
  rand: () => number = cryptoRandom,
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

/** 按导出格式把 hex 数组渲染为字符串 */
export function exportPalette(colors: string[], format: PaletteFormat): string {
  switch (format) {
    case 'css':
      return [':root {', ...colors.map((c, i) => `  --color-${i + 1}: ${c};`), '}'].join('\n')
    case 'scss':
      return colors.map((c, i) => `$color-${i + 1}: ${c};`).join('\n')
    case 'json':
      return JSON.stringify(colors)
    case 'tailwind':
      return [
        'colors: {',
        '  palette: {',
        ...colors.map((c, i) => `    ${i + 1}: '${c}',`),
        '  },',
        '}',
      ].join('\n')
  }
}

/** T2 入口：基础色留空则随机 */
export function transform(input: PaletteInput, options: PaletteOptions): string {
  inputSchema.parse(input)
  optionsSchema.parse(options)
  const mode = parseMode(options.mode)
  const count = parseCount(options.count)
  const format = parseFormat(options.format)
  const base = parseBaseColor(input.text) ?? randomBase()
  const colors = generatePalette(base, mode, count)
  return exportPalette(colors, format)
}
