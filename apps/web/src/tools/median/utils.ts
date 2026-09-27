import type { MedianInput, MedianOptions } from './schema'

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

/** 中位数：奇数个取中间，偶数个取中间两数之均值 */
export function medianOf(values: number[]): number {
  if (values.length === 0) throw new Error('没有找到有效数字')
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 排序展示：超过 100 个只显示首尾，避免输出爆炸 */
export function formatSorted(values: number[], decimals: number): string {
  const sorted = [...values].sort((a, b) => a - b)
  const f = (n: number): string => fmtFixed(n, decimals)
  if (sorted.length <= 100) return sorted.map(f).join(', ')
  const head = sorted.slice(0, 50).map(f).join(', ')
  const tail = sorted.slice(-50).map(f).join(', ')
  return `${head}, …, ${tail}（共 ${sorted.length} 个，仅显示首尾各 50 个）`
}

/** T2 同步入口 */
export function transform(input: MedianInput, options: MedianOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const decimals = Number(options.decimals ?? '4')
  const values = parseNumbers(text)
  const median = medianOf(values)
  return [
    `个数：${values.length}`,
    `排序后：${formatSorted(values, decimals)}`,
    `中位数：${fmtFixed(median, decimals)}`,
  ].join('\n')
}
