/**
 * typing（#831）工具函数：打字速度与准确率统计。
 * 纯函数，无 DOM / 网络依赖。
 */

/** WPM = (字符数/5) / (秒数/60)，保留 1 位小数 */
export function calcWpm(chars: number, seconds: number): number {
  if (!Number.isFinite(chars) || chars < 0) throw new Error('字符数必须为非负数')
  if (!Number.isFinite(seconds) || !(seconds > 0)) throw new Error('用时必须大于 0 秒')
  return Math.round(((chars * 12) / seconds) * 10) / 10
}

/** 准确率百分比，保留 1 位小数 */
export function calcAccuracy(total: number, errors: number): number {
  if (!Number.isInteger(total) || total <= 0) throw new Error('总字符数必须为正整数')
  if (!Number.isInteger(errors) || errors < 0 || errors > total) {
    throw new Error('错误数必须为 0 到总数之间的整数')
  }
  return Math.round(((total - errors) / total) * 1000) / 10
}

export interface TypingError {
  /** 字符位置（从 0 起） */
  pos: number
  expected: string
  got: string
}

export interface TypingAnalysis {
  wpm: number
  accuracy: number
  errorCount: number
  errors: TypingError[]
  correctChars: number
  totalChars: number
}

/**
 * 逐字对比目标文本与输入文本。
 * 缺字、多字、错字均记为错误项；准确率按目标文本计。
 */
export function analyzeTyping(
  target: string,
  typed: string,
  seconds: number,
): TypingAnalysis {
  if (target === '') throw new Error('目标文本不能为空')
  const errors: TypingError[] = []
  const len = Math.max(target.length, typed.length)
  for (let i = 0; i < len; i += 1) {
    const expected = target[i] ?? ''
    const got = typed[i] ?? ''
    if (expected !== got) errors.push({ pos: i, expected, got })
  }
  let correctChars = 0
  for (let i = 0; i < target.length; i += 1) {
    if (typed[i] === target[i]) correctChars += 1
  }
  return {
    wpm: calcWpm(typed.length, seconds),
    accuracy: calcAccuracy(target.length, target.length - correctChars),
    errorCount: errors.length,
    errors,
    correctChars,
    totalChars: target.length,
  }
}

/** 将错误列表格式化为可读文本（最多展示前 10 项） */
export function formatErrors(errors: TypingError[]): string {
  if (errors.length === 0) return '无错误'
  const shown = errors.slice(0, 10).map((e) => {
    const got = e.got === '' ? '（缺字）' : `「${e.got}」`
    const expected = e.expected === '' ? '（多余）' : `「${e.expected}」`
    return `#${e.pos + 1} 应为${expected}，实为${got}`
  })
  const more = errors.length > 10 ? `\n……等共 ${errors.length} 处错误` : ''
  return shown.join('\n') + more
}
