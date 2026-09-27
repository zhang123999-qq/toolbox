import type { ModeInput, ModeOptions } from './schema'

/** 数字的紧凑展示：整数直接输出，小数去掉多余的尾零 */
export function formatNum(v: number): string {
  return String(v)
}

/**
 * 解析数值列表：逗号（中英文）、空格、换行、分号、顿号均可作分隔。
 * 非数字 token 直接报错并指出位置，便于用户定位。
 */
export function parseNumbers(text: string): number[] {
  const tokens = text.split(/[\s,，、;；|]+/).filter((t) => t !== '')
  const numbers: number[] = []
  for (const token of tokens) {
    const v = Number(token)
    if (!Number.isFinite(v)) {
      throw new Error(`无法识别的数字：${token}`)
    }
    numbers.push(v)
  }
  return numbers
}

export interface ModeResult {
  readonly modes: number[]
  readonly count: number
  readonly total: number
  readonly distinct: number
}

/** 统计众数：按出现次数取最大值，多个并列全部返回（数值升序） */
export function findMode(numbers: number[]): ModeResult {
  const freq = new Map<number, number>()
  for (const v of numbers) {
    freq.set(v, (freq.get(v) ?? 0) + 1)
  }
  let max = 0
  for (const c of freq.values()) {
    if (c > max) max = c
  }
  const modes = [...freq.entries()]
    .filter(([, c]) => c === max)
    .map(([v]) => v)
    .sort((a, b) => a - b)
  return { modes, count: max, total: numbers.length, distinct: freq.size }
}

/** T2 同步入口 */
export function transform(input: ModeInput, _options: ModeOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const numbers = parseNumbers(input.text)
  if (numbers.length === 0) return ''
  const { modes, count, total, distinct } = findMode(numbers)
  const share = ((count / total) * 100).toFixed(2)

  const lines = [
    `数据个数：${total}`,
    `不同数值：${distinct} 个`,
    `众数：${modes.map(formatNum).join('、')}`,
    `出现次数：${count} 次`,
    `占比：${share}%`,
  ]
  if (modes.length > 1) {
    lines.push(`注：有 ${modes.length} 个数值并列出现最多次。`)
  }
  return lines.join('\n')
}
