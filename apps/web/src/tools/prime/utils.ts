import type { PrimeInput, PrimeOptions } from './schema'

/**
 * 性能上限：|n| ≤ 10^12。
 * 判定用确定性 Miller–Rabin（基底 2,3,5,7,11,13,17 在 n < 3.47×10^12 时无伪素数），
 * 最小质因数用筛到 10^6 的素数表试除；超过上限的输入直接拒绝，避免页面卡死。
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

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = base % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

const WITNESSES = [2n, 3n, 5n, 7n, 11n, 13n, 17n]

/**
 * 确定性 Miller–Rabin：对 n < 3,474,749,660,383（> 10^12 上限）上述基底无伪素数，
 * 因此在支持范围内判定结果是精确的，不是概率性的。
 */
export function isPrime(n: bigint): boolean {
  if (n < 2n) return false
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  // n−1 = d · 2^s（d 为奇数）
  let d = n - 1n
  let s = 0n
  while ((d & 1n) === 0n) {
    d >>= 1n
    s += 1n
  }
  witness: for (const a of WITNESSES) {
    if (a >= n) continue
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    for (let r = 1n; r < s; r++) {
      x = (x * x) % n
      if (x === n - 1n) continue witness
    }
    return false
  }
  return true
}

/** 筛出 10^6 以内的全部素数（约 7.8 万个），模块级缓存，首次调用时生成 */
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

/** 合数的最小质因数：用素数表试除（n ≤ 10^12 时最坏 7.8 万次除法，毫秒级） */
export function smallestPrimeFactor(n: bigint): bigint {
  const primes = getPrimeTable()
  for (const p of primes) {
    const bp = BigInt(p)
    if (bp * bp > n) break
    if (n % bp === 0n) return bp
  }
  return n // 自身为质数（调用方已先判定为合数时不会走到这里）
}

/** T2 同步入口 */
export function transform(input: PrimeInput, _options: PrimeOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const n = parseInteger(input.text)
  const lines = [`n = ${n}`]
  if (n < 2n) {
    lines.push('不是质数（质数是大于 1 的自然数）')
  } else if (isPrime(n)) {
    lines.push('是质数 ✓')
  } else {
    const spf = smallestPrimeFactor(n)
    lines.push('不是质数（合数）')
    lines.push(`最小质因数：${spf}`)
  }
  lines.push('注：本工具支持 |n| ≤ 10¹²，判定为确定性算法（非概率性）。')
  return lines.join('\n')
}
