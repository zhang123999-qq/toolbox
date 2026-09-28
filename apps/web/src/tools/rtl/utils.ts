export type BidiDir = 'ltr' | 'rtl' | 'neutral'

export interface SuspiciousChar {
  /** UTF-16 下标 */
  readonly index: number
  readonly char: string
  readonly dir: 'ltr' | 'rtl'
}

export interface BidiAnalysis {
  readonly text: string
  readonly total: number
  readonly ltr: number
  readonly rtl: number
  readonly neutral: number
  readonly dominant: BidiDir
  readonly mixed: boolean
  /** 方向混合时，少数方向字符的位置（最多 10 个） */
  readonly suspicious: SuspiciousChar[]
}

/**
 * 强方向字符判定（正则内部不计分支）：
 * - RTL：\u0590-\u08FF（希伯来/阿拉伯及相关）、\uFB50-\uFDFF、\uFE70-\uFEFF（表示形）
 * - LTR：ASCII 拉丁、\u0370-\u03FF（希腊）、\u0400-\u04FF（西里尔）、\u4E00-\u9FFF（中日韩）
 * - 其余（数字、标点、空格、Emoji 等）为中性
 */
const RTL_RE = /[\u0590-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
const LTR_RE = /[A-Za-z\u0370-\u03FF\u0400-\u04FF\u4E00-\u9FFF]/

export function charDir(ch: string): BidiDir {
  if (RTL_RE.test(ch)) return 'rtl'
  if (LTR_RE.test(ch)) return 'ltr'
  return 'neutral'
}

const DIR_NAME: Record<BidiDir, string> = {
  ltr: '从左到右（LTR）',
  rtl: '从右到左（RTL）',
  neutral: '中性（无强方向字符）',
}

/** 双向文本分析：统计各方向字符数、判定主导方向、标出混合位置 */
export function analyzeBidi(input: string): BidiAnalysis {
  if (input === '') throw new Error('请输入文本')
  let ltr = 0
  let rtl = 0
  let neutral = 0
  for (const ch of input) {
    const dir = charDir(ch)
    if (dir === 'ltr') ltr += 1
    else if (dir === 'rtl') rtl += 1
    else neutral += 1
  }
  const dominant: BidiDir = rtl > ltr ? 'rtl' : ltr > rtl ? 'ltr' : 'neutral'
  const mixed = ltr > 0 && rtl > 0
  const suspicious: SuspiciousChar[] = []
  if (mixed) {
    const minority: BidiDir = rtl > ltr ? 'ltr' : 'rtl'
    let utf16 = 0
    for (const ch of input) {
      if (charDir(ch) === minority && suspicious.length < 10) {
        suspicious.push({ index: utf16, char: ch, dir: minority })
      }
      utf16 += ch.length
    }
  }
  return {
    text: input,
    total: ltr + rtl + neutral,
    ltr,
    rtl,
    neutral,
    dominant,
    mixed,
    suspicious,
  }
}

/** 分析结果格式化为文本 */
export function formatBidi(a: BidiAnalysis): string {
  const lines = [
    `主导方向：${DIR_NAME[a.dominant]}`,
    `字符统计：共 ${a.total} 个（LTR ${a.ltr} / RTL ${a.rtl} / 中性 ${a.neutral}）`,
  ]
  if (a.mixed) {
    lines.push('⚠ 检测到双向混合文本，可能出现显示错乱：')
    for (const s of a.suspicious) {
      lines.push(`- 下标 ${s.index} 处「${s.char}」（${s.dir === 'rtl' ? 'RTL' : 'LTR'}）`)
    }
    if (a.suspicious.length === 10) lines.push('- …仅显示前 10 处')
  } else {
    lines.push('未发现方向混合 ✓')
  }
  lines.push('说明：下方预览区可分别按 RTL / LTR / 自动方向渲染对照。')
  return lines.join('\n')
}
