import type { FactorizationInput, FactorizationOptions } from './schema'

/**
 * 性能上限：|n| ≤ 10^12。
 * 分解用筛到 10^6 的素数表试除：n ≤ 10^12 时最坏约 7.8 万次除法，毫秒级；
 * 若放开到更大数量级，试除次数会随 √n 线性增长导致页面卡死，故设上限。
 */
export const MAX_ABS = 1_000_000_000_000

/** 严格解析整数（含负号） */
export function parseInteger(text: string): bigint {
  const t = text.trim()
  if (t === '') throw new Error('输入不能为空')
  if (!/^-?\d+$/.test(t)) throw new Error(`请输入整数：${t}`)
  const n = BigInt(t)
  if (n > BigInt(MAX_ABS) || n < BigInt(-MAX_ABS)) {
    throw new Error(`超出支持范围：仅支持 |n| ≤ 10¹²（即 ${MAX_ABS}）`)
  }
  return n
}

/** 筛出 10^6 以内的全部素数，模块级缓存 */
let primeTable: number[] | null = null
export function getPrimeTable(): number[] {
  if (primeTable) return primeTable
  const limit = 1_000_000
  const sieve = new Uint8Array(limit + 1)
  sieve.fill(1)
  sieve[0] = 0
  sieve[1] = 0
  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= limit; j += i) sieve[j] = 0
    }
  }
  const primes: number[] = []
  for (let i = 2; i <= limit; i++) {
    if (sieve[i]) primes.push(i)
  }
  primeTable = primes
  return primes
}

export interface Factor {
  readonly prime: bigint
  readonly exponent: number
}

/** 质因数分解：返回 (质因数, 指数) 列表（质因数升序） */
export function factorize(n: bigint): Factor[] {
  const abs = n < 0n ? -n : n
  const factors: Factor[] = []
  let rest = abs
  for (const p of getPrimeTable()) {
    const bp = BigInt(p)
    if (bp * bp > rest) break
    if (rest % bp === 0n) {
      let e = 0
      while (rest % bp === 0n) {
        rest /= bp
        e++
      }
      factors.push({ prime: bp, exponent: e })
    }
  }
  if (rest > 1n) factors.push({ prime: rest, exponent: 1 })
  return factors
}

/** 因数个数 d(n) = ∏(eᵢ+1) */
export function divisorCount(factors: readonly Factor[]): bigint {
  return factors.reduce((a, f) => a * BigInt(f.exponent + 1), 1n)
}

/** 因数和 σ(n) = ∏((pᵢ^(eᵢ+1)−1)/(pᵢ−1)) */
export function divisorSum(factors: readonly Factor[]): bigint {
  return factors.reduce((a, f) => {
    const p = f.prime
    const e = BigInt(f.exponent)
    return a * ((p ** (e + 1n) - 1n) / (p - 1n))
  }, 1n)
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

/** 指数上标：12 → ¹² */
export function superscript(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPT[d] ?? d)
    .join('')
}

/** 分解式展示：360 → 2³ × 3² × 5 */
export function formatFactors(factors: readonly Factor[]): string {
  return factors
    .map((f) => (f.exponent === 1 ? String(f.prime) : `${f.prime}${superscript(f.exponent)}`))
    .join(' × ')
}

/** 大整数千分位展示 */
export function formatBig(v: bigint): string {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** T2 同步入口 */
export function transform(input: FactorizationInput, _options: FactorizationOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const n = parseInteger(input.text)
  if (n === 0n) throw new Error('0 不能进行因数分解（0 有无穷多个因数）')

  const lines = [`n = ${n}`]
  const abs = n < 0n ? -n : n
  if (abs === 1n) {
    lines.push('±1 没有质因数')
  } else {
    const factors = factorize(abs)
    const sign = n < 0n ? '−1 × ' : ''
    lines.push(`${n} = ${sign}${formatFactors(factors)}`)
    lines.push(`质因数个数（含重复）：${factors.reduce((a, f) => a + f.exponent, 0)}`)
    lines.push(`不同质因数个数：${factors.length}`)
    lines.push(`因数个数：${formatBig(divisorCount(factors))}`)
    lines.push(`因数和：${formatBig(divisorSum(factors))}`)
  }
  lines.push('注：本工具支持 |n| ≤ 10¹²（性能上限）。')
  return lines.join('\n')
}
