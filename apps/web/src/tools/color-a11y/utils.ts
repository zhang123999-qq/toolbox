/**
 * color-a11y（#729）纯函数：色盲模拟与无障碍安全检查。
 *
 * 与 #716 wcag-contrast 的区别：本工具不做通用对比度检测，
 * 而是把前景 / 背景放到四种色觉模型下模拟，检查色盲用户是否仍能通过 AA。
 * 模拟矩阵采用 Machado 等人（2009）广泛使用的版本，在线性光 RGB 空间应用。
 */
import { parse, rgb } from 'culori'

export type ColorBlindType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'

export const COLOR_BLIND_TYPES: readonly ColorBlindType[] = [
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'achromatopsia',
]

export const COLOR_BLIND_LABELS: Readonly<Record<ColorBlindType, string>> = {
  protanopia: '红色盲',
  deuteranopia: '绿色盲',
  tritanopia: '蓝色盲',
  achromatopsia: '全色盲',
}

/** sRGB → 线性光 */
function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** 线性光 → sRGB */
function toSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}

/** Machado（2009）色盲模拟矩阵（行主序，作用于线性 RGB） */
const SIMULATION_MATRICES: Readonly<
  Record<ColorBlindType, readonly (readonly [number, number, number])[]>
> = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function channelToHex(c: number): string {
  return Math.round(clamp01(c) * 255)
    .toString(16)
    .padStart(2, '0')
}

/** 解析 CSS 颜色为 [r,g,b]（0–1 sRGB）。非法抛中文错。 */
export function parseRgb(input: string): [number, number, number] {
  const raw = input.trim()
  if (raw === '') throw new Error('请输入颜色')
  const color = parse(raw)
  if (!color) throw new Error(`颜色「${raw}」无法解析：支持 #rgb / #rrggbb / rgb() / 颜色名`)
  const c = rgb(color)
  return [c.r, c.g, c.b]
}

/**
 * 色盲模拟：返回模拟后的 #rrggbb。
 * type 为 'normal' 时原样返回（规范化为 #rrggbb）。
 */
export function simulateColorBlindness(input: string, type: ColorBlindType | 'normal'): string {
  const [r, g, b] = parseRgb(input)
  if (type === 'normal') {
    return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
  }
  const m = SIMULATION_MATRICES[type]
  const lin: [number, number, number] = [toLinear(r), toLinear(g), toLinear(b)]
  const sim: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < 3; i += 1) {
    sim[i] = toSrgb(clamp01(m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2]))
  }
  return `#${channelToHex(sim[0])}${channelToHex(sim[1])}${channelToHex(sim[2])}`
}

/** 相对亮度（WCAG） */
function luminance([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** WCAG 对比度（1–21） */
export function contrastRatioOf(fg: string, bg: string): number {
  const l1 = luminance(parseRgb(fg))
  const l2 = luminance(parseRgb(bg))
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

export interface BlindSimulation {
  readonly type: ColorBlindType
  readonly label: string
  readonly fg: string
  readonly bg: string
  readonly ratio: number
  readonly passAA: boolean
}

export interface ColorA11yReport {
  readonly fg: string
  readonly bg: string
  readonly normalRatio: number
  readonly normalPassAA: boolean
  readonly simulations: readonly BlindSimulation[]
  /** 四种色盲下是否全部通过 AA（4.5:1） */
  readonly colorBlindSafe: boolean
}

/**
 * 生成完整报告：正常视觉对比度 + 四种色盲模拟下的对比度与 AA 判定。
 */
export function colorBlindReport(fgInput: string, bgInput: string): ColorA11yReport {
  const fg = parseRgb(fgInput)
  const bg = parseRgb(bgInput)
  const fgHex = `#${channelToHex(fg[0])}${channelToHex(fg[1])}${channelToHex(fg[2])}`
  const bgHex = `#${channelToHex(bg[0])}${channelToHex(bg[1])}${channelToHex(bg[2])}`
  const normalRatio = contrastRatioOf(fgHex, bgHex)
  const simulations = COLOR_BLIND_TYPES.map((type): BlindSimulation => {
    const simFg = simulateColorBlindness(fgHex, type)
    const simBg = simulateColorBlindness(bgHex, type)
    const ratio = contrastRatioOf(simFg, simBg)
    return {
      type,
      label: COLOR_BLIND_LABELS[type],
      fg: simFg,
      bg: simBg,
      ratio,
      passAA: ratio >= 4.5,
    }
  })
  return {
    fg: fgHex,
    bg: bgHex,
    normalRatio,
    normalPassAA: normalRatio >= 4.5,
    simulations,
    colorBlindSafe: simulations.every((s) => s.passAA),
  }
}

/**
 * 色盲安全判定：四种色盲模拟下对比度是否全部达到 AA（4.5:1）。
 */
export function isColorBlindSafe(fgInput: string, bgInput: string): boolean {
  return colorBlindReport(fgInput, bgInput).colorBlindSafe
}

/**
 * 渲染文本报告（供输出区 / 复制 / 下载）。
 */
export function formatColorA11yReport(report: ColorA11yReport): string {
  const lines = [
    `前景 ${report.fg} 背景 ${report.bg}`,
    `正常视觉对比度：${report.normalRatio.toFixed(2)}（AA ${report.normalPassAA ? '通过' : '不通过'}）`,
    '',
    '色盲模拟：',
  ]
  for (const s of report.simulations) {
    lines.push(
      `  ${s.label}：前景 ${s.fg} 背景 ${s.bg} 对比度 ${s.ratio.toFixed(2)}（AA ${s.passAA ? '通过' : '不通过'}）`,
    )
  }
  lines.push(
    '',
    report.colorBlindSafe
      ? '结论：色盲安全（四种色觉下均通过 AA）。'
      : '结论：存在色盲用户难以辨识的风险，建议调整配色。',
  )
  return lines.join('\n')
}
