/**
 * reduced-motion（#736）纯函数：减少动画 CSS 生成与动画声明检测。
 *
 * 为偏好减少动画的用户生成 @media (prefers-reduced-motion: reduce) 样式，
 * 并可扫描现有 CSS 列出 animation / transition / @keyframes 声明。
 */

export interface ReducedMotionOptions {
  /** 是否关闭 animation 动画 */
  readonly disableAnimations: boolean
  /** 是否关闭 transition 过渡 */
  readonly disableTransitions: boolean
  /** 是否关闭平滑滚动 */
  readonly disableSmoothScroll: boolean
  /** 额外选择器（逗号分隔），同样应用关闭规则 */
  readonly extraSelectors: string
}

/** 选择器白名单字符：字母数字及常用 CSS 选择器符号 */
const SELECTOR_RE = /^[a-zA-Z0-9_\-.\s#:>*+~="'[\]()|^$*,]+$/

/** 校验并拆分额外选择器 */
export function parseExtraSelectors(raw: string): string[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  for (const p of parts) {
    if (!SELECTOR_RE.test(p)) throw new Error(`额外选择器不合法：${p}`)
  }
  return parts
}

/**
 * 生成 prefers-reduced-motion CSS。
 * 至少需要开启一项关闭规则，否则抛错。
 */
export function generateReducedMotionCss(opts: ReducedMotionOptions): string {
  const { disableAnimations, disableTransitions, disableSmoothScroll } = opts
  if (!disableAnimations && !disableTransitions && !disableSmoothScroll) {
    throw new Error('请至少开启一项关闭规则（动画 / 过渡 / 平滑滚动）')
  }
  const extra = parseExtraSelectors(opts.extraSelectors)
  const selectors = ['*, *::before, *::after', ...extra]
  const lines: string[] = [
    '/* 为偏好减少动画的用户关闭动画效果 */',
    '@media (prefers-reduced-motion: reduce) {',
  ]
  if (disableAnimations || disableTransitions) {
    lines.push(`  ${selectors.join(', ')} {`)
    if (disableAnimations) {
      lines.push('    animation-duration: 0.01ms !important;')
      lines.push('    animation-iteration-count: 1 !important;')
    }
    if (disableTransitions) {
      lines.push('    transition-duration: 0.01ms !important;')
    }
    lines.push('  }')
  }
  if (disableSmoothScroll) {
    lines.push('  html {')
    lines.push('    scroll-behavior: auto !important;')
    lines.push('  }')
  }
  lines.push('}')
  return lines.join('\n')
}

export type AnimationKind = 'animation' | 'transition' | 'keyframes'

export interface AnimationFinding {
  readonly kind: AnimationKind
  /** 声明内容或关键帧名称 */
  readonly detail: string
  /** 所在行号（1 起） */
  readonly line: number
}

/** 去除 CSS 注释 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * 简易扫描 CSS 中的 animation / transition / @keyframes 声明。
 * 返回按行号排序的发现列表；输入为空抛错。
 */
export function detectAnimations(cssText: string): AnimationFinding[] {
  if (cssText.trim() === '') throw new Error('请输入要扫描的 CSS 代码')
  const clean = stripComments(cssText)
  const findings: AnimationFinding[] = []
  const lines = clean.split('\n')
  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    const kf = /@keyframes\s+([\w-]+)/.exec(line)
    if (kf) {
      findings.push({ kind: 'keyframes', detail: kf[1] as string, line: lineNo })
    }
    const anim =
      /(^|[;{])\s*animation(?:-name|-duration|-timing-function|-delay|-iteration-count|-direction|-fill-mode|-play-state)?\s*:\s*([^;}{]+)/.exec(
        line,
      )
    if (anim) {
      findings.push({ kind: 'animation', detail: (anim[2] as string).trim(), line: lineNo })
    }
    const trans =
      /(^|[;{])\s*transition(?:-property|-duration|-timing-function|-delay)?\s*:\s*([^;}{]+)/.exec(
        line,
      )
    if (trans) {
      findings.push({ kind: 'transition', detail: (trans[2] as string).trim(), line: lineNo })
    }
  })
  findings.sort((a, b) => a.line - b.line)
  return findings
}

/** 汇总检测结果为可读文本 */
export function summarizeFindings(findings: readonly AnimationFinding[]): string {
  if (findings.length === 0) return '未发现 animation / transition / @keyframes 声明'
  const counts = { animation: 0, transition: 0, keyframes: 0 }
  for (const f of findings) counts[f.kind] += 1
  const parts: string[] = [`共发现 ${findings.length} 处动画相关声明`]
  if (counts.keyframes > 0) parts.push(`@keyframes ${counts.keyframes} 个`)
  if (counts.animation > 0) parts.push(`animation ${counts.animation} 处`)
  if (counts.transition > 0) parts.push(`transition ${counts.transition} 处`)
  return parts.join('，')
}
