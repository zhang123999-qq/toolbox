import type { PermutationInput, PermutationOptions } from './schema'

/** 性能上限：n 超过 1000 时阶乘位数爆炸（1000! 有 2568 位），浏览器会明显卡顿 */
const MAX_N = 1000

/** 严格解析非负整数 */
export function parseNonNegativeInt(text: string, name: string): number {
  const t = text.trim()
  if (t === '') throw new Error(`${name}不能为空`)
  if (!/^\d+$/.test(t)) throw new Error(`${name}必须是整数：${t}`)
  const n = Number(t)
  if (n > MAX_N) throw new Error(`${name}超出上限 ${MAX_N}（防止计算过慢）`)
  return n
}

/** 阶乘：BigInt 精确计算 */
export function factorial(n: number): bigint {
  let result = 1n
  for (let i = 2; i <= n; i++) {
    result *= BigInt(i)
  }
  return result
}

/** 排列数 P(n,k) = n!/(n−k)!：用连乘避免先算大阶乘 */
export function perm(n: number, k: number): bigint {
  let result = 1n
  for (let i = 0; i < k; i++) {
    result *= BigInt(n - i)
  }
  return result
}

/** 组合数 C(n,k) = P(n,k)/k! */
export function comb(n: number, k: number): bigint {
  return perm(n, k) / factorial(k)
}

/** 大整数千分位展示：1234567 → 1,234,567 */
export function formatBig(v: bigint): string {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** T2 同步入口 */
export function transform(input: PermutationInput, _options: PermutationOptions): string {
  const nText = input.text.trim()
  if (nText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const n = parseNonNegativeInt(nText, 'n')
  const kText = input.k.trim()
  const k = kText === '' ? n : parseNonNegativeInt(kText, 'k')
  if (k > n) throw new Error(`k 不能大于 n（k=${k}，n=${n}）`)

  const p = perm(n, k)
  const c = comb(n, k)
  const fact = factorial(n)

  const lines = [
    `n = ${n}，k = ${k}`,
    `排列数 P(${n},${k}) = ${formatBig(p)}`,
    `组合数 C(${n},${k}) = ${formatBig(c)}`,
    `${n}! = ${formatBig(fact)}`,
  ]
  return lines.join('\n')
}
