import type { AverageInput, AverageOptions } from './schema'

const SEP_RE = /[\s,;，；、]+/

/** 解析数字串：空白 / 逗号 / 分号（中英文）分隔，非法项抛中文错误 */
export function parseNumbers(text: string): number[] {
  const parts = text
    .trim()
    .split(SEP_RE)
    .filter((p) => p !== '')
  if (parts.length === 0) throw new Error('没有找到有效数字')
  return parts.map((p) => {
    const n = Number(p)
    if (!Number.isFinite(n)) throw new Error('不是有效数字：' + p)
    return n
  })
}

/** 按指定小数位数格式化，并去掉无意义的尾零（2.5000 → 2.5） */
export function fmtFixed(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return String(n)
  const s = n.toFixed(decimals)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

export interface AverageResult {
  count: number
  sum: number
  mean: number
  min: number
  max: number
}

export function averageOf(values: number[]): AverageResult {
  if (values.length === 0) throw new Error('没有找到有效数字')
  let sum = 0
  let min = values[0]
  let max = values[0]
  for (const v of values) {
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  return { count: values.length, sum, mean: sum / values.length, min, max }
}

/** T2 同步入口 */
export function transform(input: AverageInput, options: AverageOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const decimals = Number(options.decimals ?? '4')
  const r = averageOf(parseNumbers(text))
  const f = (n: number): string => fmtFixed(n, decimals)
  return [
    `个数：${r.count}`,
    `总和：${f(r.sum)}`,
    `算术平均数：${f(r.mean)}`,
    `最小值：${f(r.min)}`,
    `最大值：${f(r.max)}`,
  ].join('\n')
}
