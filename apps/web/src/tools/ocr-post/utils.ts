/**
 * ocr-post —— OCR 文本规则纠错的纯函数层
 *
 * 四条相互独立的规则（均可在界面上开关），按固定顺序执行：
 * 全半角统一 → 形近字纠错 → 多余空白清理 → 多余换行合并。
 *
 * 注意：这是**确定性规则纠错，不是 AI**——上下文相关的误识（如把整词认错）
 * 处理不了，规则也可能误伤（如小数点后的 0），重要文本请人工复核。
 */

/** 四条规则的开关 */
export interface OcrOptions {
  readonly confusables: boolean
  readonly spaces: boolean
  readonly lineBreaks: boolean
  readonly width: boolean
}

/** 单条规则的执行结果 */
export interface RuleResult {
  readonly text: string
  readonly count: number
}

/** 整体后处理结果 */
export interface PostResult {
  readonly text: string
  readonly changes: number
  readonly applied: readonly string[]
}

const CJK_RE = /[\u4e00-\u9fff]/
const LETTER_RE = /[A-Za-z\u4e00-\u9fff]/
const DIGIT_RE = /[0-9]/

function isLetter(ch: string): boolean {
  return LETTER_RE.test(ch)
}
function isDigit(ch: string): boolean {
  return DIGIT_RE.test(ch)
}
function isCjk(ch: string): boolean {
  return CJK_RE.test(ch)
}

/**
 * 形近字纠错（上下文感知）：
 * - 字母之间的 '0' → 'O'（如 h0me → hOme 的 OCR 误识），字母之间的 '1' → 'l'；
 * - 数字之间的 'O'/'o' → '0'，数字之间的 'l'/'I' → '1'。
 * 孤立字符不动，避免误伤真实数字。
 */
export function fixConfusables(text: string): RuleResult {
  if (typeof text !== 'string') throw new Error('内容必须是文本')
  const chars = [...text]
  let count = 0
  for (let i = 0; i < chars.length; i++) {
    const prev = i > 0 ? chars[i - 1]! : ''
    const next = i < chars.length - 1 ? chars[i + 1]! : ''
    const ch = chars[i]!
    if (isLetter(prev) && isLetter(next)) {
      if (ch === '0') {
        chars[i] = 'O'
        count++
      } else if (ch === '1') {
        chars[i] = 'l'
        count++
      }
    } else if (isDigit(prev) && isDigit(next)) {
      if (ch === 'O' || ch === 'o') {
        chars[i] = '0'
        count++
      } else if (ch === 'l' || ch === 'I') {
        chars[i] = '1'
        count++
      }
    }
  }
  return { text: chars.join(''), count }
}

/**
 * 多余空白清理：
 * - 删除中文字符之间的空格（如 "你 好" → "你好"）；
 * - 多个连续空格/制表符合并为一个；
 * - 去掉每行首尾空白。
 */
export function normalizeSpaces(text: string): RuleResult {
  if (typeof text !== 'string') throw new Error('内容必须是文本')
  let count = 0
  const lines = text.split('\n').map((line) => {
    const trimmed = line.trim()
    if (trimmed !== line) count++
    return trimmed
  })
  let out = lines.join('\n')
  // 用 lookahead 避免相邻两处匹配重叠吞字（如"， 世   界"中的"世"）
  let prev = ''
  while (prev !== out) {
    prev = out
    out = out.replace(
      /([\u4e00-\u9fff，。！？；：、〈〉「」『』（）])[ \t]+(?=[\u4e00-\u9fff，。！？；：、〈〉「」『』（）])/g,
      (_m, a: string) => {
        count++
        return a
      },
    )
  }
  out = out.replace(/[ \t]{2,}/g, () => {
    count++
    return ' '
  })
  return { text: out, count }
}

/** 两行合并：连字符断行去 '-' 直连；中文间直连；其余加空格 */
function joinTwoLines(a: string, b: string): string {
  if (a.endsWith('-')) return a.slice(0, -1) + b
  // 调用方已过滤空行，a / b 在此恒非空
  const lastA = a[a.length - 1]!
  const firstB = b[0]!
  if (isCjk(lastA) && isCjk(firstB)) return a + b
  return `${a} ${b}`
}

/**
 * 多余换行合并：段落内（单个 \n 分隔）的换行按规则合并为一行，
 * 空行分隔的段落保留。返回合并次数。
 */
export function mergeLineBreaks(text: string): RuleResult {
  if (typeof text !== 'string') throw new Error('内容必须是文本')
  let count = 0
  const out = text
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split('\n').filter((l) => l.trim() !== '')
      let merged = lines[0] ?? ''
      for (let i = 1; i < lines.length; i++) {
        merged = joinTwoLines(merged, lines[i]!)
        count++
      }
      return merged
    })
    .join('\n\n')
  return { text: out, count }
}

/**
 * 全半角统一：全角字母/数字/空格（Ａ-Ｚ ａ-ｚ ０-９ Ｕ+3000）→ 半角。
 * 中文标点（，。！？；：）不受影响。
 */
export function unifyWidth(text: string): RuleResult {
  if (typeof text !== 'string') throw new Error('内容必须是文本')
  let count = 0
  const out = text.replace(/[Ａ-Ｚａ-ｚ０-９\u3000]/g, (ch) => {
    count++
    return ch === '\u3000' ? ' ' : String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  })
  return { text: out, count }
}

const RULE_NAMES = {
  width: '全半角统一',
  confusables: '形近字纠错',
  spaces: '多余空白清理',
  lineBreaks: '多余换行合并',
} as const

/**
 * 按固定顺序执行启用的规则，返回最终文本、总改动数与启用的规则名。
 * 空文本直接返回（改动数为 0）。
 */
export function postProcess(text: string, opts: OcrOptions): PostResult {
  if (typeof text !== 'string') throw new Error('内容必须是文本')
  if (text === '') return { text: '', changes: 0, applied: [] }
  const applied: string[] = []
  let changes = 0
  let out = text
  const steps: (readonly [keyof OcrOptions, (t: string) => RuleResult])[] = [
    ['width', unifyWidth],
    ['confusables', fixConfusables],
    ['spaces', normalizeSpaces],
    ['lineBreaks', mergeLineBreaks],
  ]
  for (const [key, fn] of steps) {
    if (opts[key]) {
      const r = fn(out)
      out = r.text
      changes += r.count
      applied.push(RULE_NAMES[key])
    }
  }
  return { text: out, changes, applied }
}
