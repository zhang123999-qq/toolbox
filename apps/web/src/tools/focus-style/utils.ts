/**
 * focus-style —— 焦点样式的纯函数层
 *
 * 生成 :focus-visible 样式 CSS（含 prefers-reduced-motion 下关闭过渡），
 * 并用手写 WCAG 公式校验焦点色与背景色的对比度（零依赖，不引入 culori）。
 */

/** 默认值 */
export const DEFAULT_COLOR = '#2563eb'
export const DEFAULT_BG = '#ffffff'
export const DEFAULT_WIDTH = 2
export const DEFAULT_OFFSET = 2
export const DEFAULT_RADIUS = 4

/** 支持的描边样式 */
export const OUTLINE_STYLES = ['solid', 'dashed', 'dotted', 'double'] as const
export type OutlineStyle = (typeof OUTLINE_STYLES)[number]

/** WCAG 非文本对比度要求（UI 组件） */
export const UI_CONTRAST_MIN = 3

export interface FocusStyleParams {
  readonly color: string
  readonly width: number
  readonly offset: number
  readonly radius: number
  readonly outlineStyle: OutlineStyle
}

/** 校验并规范化 hex 颜色（#rgb/#rrggbb → 小写 #rrggbb） */
export function validateHexColor(input: string, name: string): string {
  const text = input.trim()
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(text)
  if (!m) throw new Error(`${name}不合法：请输入 #rgb 或 #rrggbb 格式的颜色`)
  const hex = m[1] as string
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  return `#${full.toLowerCase()}`
}

/** 校验像素数值 */
export function validatePx(value: number, name: string, min: number, max: number): number {
  if (!Number.isFinite(value)) throw new Error(`${name}必须是数字`)
  if (!Number.isInteger(value)) throw new Error(`${name}必须是整数`)
  if (value < min || value > max) throw new Error(`${name}超出范围：${min}–${max}px`)
  return value
}

/** 校验描边样式 */
export function validateOutlineStyle(style: string): OutlineStyle {
  if ((OUTLINE_STYLES as readonly string[]).includes(style)) return style as OutlineStyle
  throw new Error(`描边样式不合法：${OUTLINE_STYLES.join(' / ')}`)
}

/** hex → [r,g,b]（0–255） */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.slice(1)
  return [Number.parseInt(h.slice(0, 2), 16), Number.parseInt(h.slice(2, 4), 16), Number.parseInt(h.slice(4, 6), 16)]
}

/** WCAG 相对亮度 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 对比度（已规范化的 hex） */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

export interface FocusContrast {
  readonly ratio: number
  readonly pass: boolean
}

/** 校验焦点色与背景色的对比度（WCAG 非文本 ≥ 3:1） */
export function checkFocusContrast(color: string, bg: string): FocusContrast {
  const ratio = contrastRatio(validateHexColor(color, '焦点颜色'), validateHexColor(bg, '背景颜色'))
  return { ratio, pass: ratio >= UI_CONTRAST_MIN }
}

/**
 * 生成 :focus-visible CSS。
 * selector 可注入作用域（预览用带作用域的选择器，复制用 :focus-visible）。
 */
export function generateFocusStyle(
  params: FocusStyleParams,
  selector = ':focus-visible',
): string {
  const color = validateHexColor(params.color, '焦点颜色')
  const width = validatePx(params.width, '描边宽度', 1, 8)
  const offset = validatePx(params.offset, '描边偏移', 0, 16)
  const radius = validatePx(params.radius, '圆角', 0, 32)
  const style = validateOutlineStyle(params.outlineStyle)
  return [
    `${selector} {`,
    `  outline: ${width}px ${style} ${color};`,
    `  outline-offset: ${offset}px;`,
    `  border-radius: ${radius}px;`,
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    `  ${selector} {`,
    '    transition: none;',
    '  }',
    '}',
  ].join('\n')
}

/** 生成带对比度注释的可复制 CSS */
export function buildCssWithComment(params: FocusStyleParams, bg: string): string {
  const css = generateFocusStyle(params)
  const { ratio, pass } = checkFocusContrast(params.color, bg)
  const verdict = pass ? '通过' : '未通过'
  const bgNorm = validateHexColor(bg, '背景颜色')
  return [
    `/* 焦点颜色与背景 ${bgNorm} 的对比度为 ${ratio.toFixed(2)}:1，WCAG 非文本对比要求 ≥ 3:1：${verdict} */`,
    css,
  ].join('\n')
}
