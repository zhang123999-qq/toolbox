/**
 * high-contrast（#737）纯函数：高对比度主题 CSS 生成与对比度校验。
 *
 * 生成 dark / light 高对比主题 CSS，以及 forced-colors: active 下的
 * 系统色适配；对比度公式为手写 WCAG 实现（零依赖）。
 */

export type HighContrastMode = 'dark' | 'light' | 'forced'

export const HIGH_CONTRAST_MODES: readonly HighContrastMode[] = ['dark', 'light', 'forced']

export interface HighContrastParams {
  readonly background: string
  readonly foreground: string
  readonly linkColor: string
  readonly mode: HighContrastMode
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

/** 校验模式 */
export function validateMode(mode: string): HighContrastMode {
  if ((HIGH_CONTRAST_MODES as readonly string[]).includes(mode)) return mode as HighContrastMode
  throw new Error(`模式不合法：${HIGH_CONTRAST_MODES.join(' / ')}`)
}

/** hex → [r,g,b]（0–255） */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.slice(1)
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
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

export interface ContrastCheck {
  readonly ratio: number
  /** 正文 AA ≥ 4.5:1 */
  readonly passAA: boolean
  /** 正文 AAA ≥ 7:1 */
  readonly passAAA: boolean
  /** UI 组件 ≥ 3:1 */
  readonly passUI: boolean
}

/** 校验一对颜色的对比度（WCAG 2.1） */
export function checkContrastPair(fg: string, bg: string): ContrastCheck {
  const ratio = contrastRatio(validateHexColor(fg, '前景颜色'), validateHexColor(bg, '背景颜色'))
  return { ratio, passAA: ratio >= 4.5, passAAA: ratio >= 7, passUI: ratio >= 3 }
}

/** 生成高对比度主题 CSS */
export function generateHighContrastCss(params: HighContrastParams): string {
  const background = validateHexColor(params.background, '背景颜色')
  const foreground = validateHexColor(params.foreground, '前景颜色')
  const linkColor = validateHexColor(params.linkColor, '链接颜色')
  const mode = validateMode(params.mode)
  const lines: string[] = [
    `/* 高对比度主题（${mode}）：将 .hc-theme 用于需要高对比的容器 */`,
    ':root {',
    `  --hc-bg: ${background};`,
    `  --hc-fg: ${foreground};`,
    `  --hc-link: ${linkColor};`,
    '}',
    '',
    '.hc-theme {',
    '  background-color: var(--hc-bg);',
    '  color: var(--hc-fg);',
    '}',
    '',
    '.hc-theme a {',
    '  color: var(--hc-link);',
    '  text-decoration: underline;',
    '}',
    '',
    '.hc-theme :focus-visible {',
    '  outline: 3px solid var(--hc-fg);',
    '  outline-offset: 2px;',
    '}',
    '',
    '/* 系统高对比度（Windows 高对比主题）适配：使用系统色 */',
    '@media (forced-colors: active) {',
    '  .hc-theme {',
    '    background-color: Canvas;',
    '    color: CanvasText;',
    '    forced-color-adjust: none;',
    '  }',
    '  .hc-theme a {',
    '    color: LinkText;',
    '  }',
    '  .hc-theme :focus-visible {',
    '    outline-color: Highlight;',
    '  }',
  ]
  if (mode === 'forced') {
    lines.push('  .hc-theme .hc-force-only {', '    forced-color-adjust: auto;', '  }')
  }
  lines.push('}')
  return lines.join('\n')
}

/** 生成对比度报告文本 */
export function buildContrastReport(params: HighContrastParams): string {
  const background = validateHexColor(params.background, '背景颜色')
  const foreground = validateHexColor(params.foreground, '前景颜色')
  const linkColor = validateHexColor(params.linkColor, '链接颜色')
  const fg = checkContrastPair(foreground, background)
  const link = checkContrastPair(linkColor, background)
  const verdict = (c: ContrastCheck): string =>
    c.passAAA ? 'AAA 通过' : c.passAA ? 'AA 通过' : c.passUI ? '仅 UI 级别通过' : '未通过'
  return [
    `正文（前景 ${foreground} / 背景 ${background}）：${fg.ratio.toFixed(2)}:1，${verdict(fg)}`,
    `链接（链接 ${linkColor} / 背景 ${background}）：${link.ratio.toFixed(2)}:1，${verdict(link)}`,
  ].join('\n')
}
