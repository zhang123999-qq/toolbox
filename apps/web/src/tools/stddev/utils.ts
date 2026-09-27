import type { StddevInput, StddevOptions } from './schema'

/** 数值解析：逗号（中英文）、空格、换行、分号、顿号、竖线均可作分隔 */
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

/** 结果展示：保留至多 6 位小数，去掉多余尾零，避免浮点噪声 */
export function formatResult(v: number): string {
  return String(Number(v.toFixed(6)))
}

export interface StddevResult {
  readonly mean: number
  readonly stddev: number
  readonly sample: boolean
}

/**
 * 计算标准差（方差的平方根）。
 * sample=false → 总体标准差（分母 n）；
 * sample=true → 样本标准差（分母 n−1，至少需要 2 个数据）。
 */
export function calcStddev(numbers: number[], sample: boolean): StddevResult {
  const n = numbers.length
  if (sample && n < 2) {
    throw new Error('样本标准差至少需要 2 个数据')
  }
  const mean = numbers.reduce((a, b) => a + b, 0) / n
  const sumSq = numbers.reduce((a, b) => a + (b - mean) * (b - mean), 0)
  const variance = sample ? sumSq / (n - 1) : sumSq / n
  return { mean, stddev: Math.sqrt(variance), sample }
}

/** T2 同步入口 */
export function transform(input: StddevInput, options: StddevOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const numbers = parseNumbers(input.text)
  if (numbers.length === 0) return ''
  const sample = options.sample ?? false
  const { mean, stddev } = calcStddev(numbers, sample)

  return [
    `数据个数：${numbers.length}`,
    `均值：${formatResult(mean)}`,
    `${sample ? '样本标准差' : '总体标准差'}：${formatResult(stddev)}`,
    sample ? '（分母 n−1）' : '（分母 n）',
  ].join('\n')
}
