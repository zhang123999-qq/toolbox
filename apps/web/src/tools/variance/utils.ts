import type { VarianceInput, VarianceOptions } from './schema'

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

/** 结果展示：保留至多 6 位小数，去掉多余尾零，避免 0.1+0.2 式浮点噪声 */
export function formatResult(v: number): string {
  return String(Number(v.toFixed(6)))
}

export interface VarianceResult {
  readonly mean: number
  readonly variance: number
  readonly sample: boolean
}

/**
 * 计算方差。sample=false → 总体方差（分母 n）；
 * sample=true → 样本方差（分母 n−1，至少需要 2 个数据）。
 */
export function calcVariance(numbers: number[], sample: boolean): VarianceResult {
  const n = numbers.length
  if (sample && n < 2) {
    throw new Error('样本方差至少需要 2 个数据')
  }
  const mean = numbers.reduce((a, b) => a + b, 0) / n
  const sumSq = numbers.reduce((a, b) => a + (b - mean) * (b - mean), 0)
  const variance = sample ? sumSq / (n - 1) : sumSq / n
  return { mean, variance, sample }
}

/** T2 同步入口 */
export function transform(input: VarianceInput, options: VarianceOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const numbers = parseNumbers(input.text)
  if (numbers.length === 0) return ''
  const sample = options.sample ?? false
  const { mean, variance } = calcVariance(numbers, sample)

  return [
    `数据个数：${numbers.length}`,
    `均值：${formatResult(mean)}`,
    `${sample ? '样本方差' : '总体方差'}：${formatResult(variance)}`,
    sample ? '（分母 n−1）' : '（分母 n）',
  ].join('\n')
}
