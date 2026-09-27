import type { GcdLcmInput, GcdLcmOptions } from './schema'

const INT_RE = /^[+-]?\d+$/

function absBig(n: bigint): bigint {
  return n < 0n ? -n : n
}

/** 欧几里得算法（辗转相除），BigInt 精确 */
export function gcd(a: bigint, b: bigint): bigint {
  let x = absBig(a)
  let y = absBig(b)
  while (y !== 0n) {
    const t = x % y
    x = y
    y = t
  }
  return x
}

/** 最小公倍数：|a·b| / gcd；任一为 0 时为 0 */
export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n
  return (absBig(a) * absBig(b)) / gcd(a, b)
}

/** 严格解析整数：不允许小数、指数、空格内嵌 */
export function parseIntStrict(text: string): bigint {
  const t = text.trim()
  if (t === '') throw new Error('整数不能为空')
  if (!INT_RE.test(t)) throw new Error('请输入整数：' + text.trim())
  return BigInt(t)
}

/** T2 同步入口 */
export function transform(input: GcdLcmInput, _options: GcdLcmOptions): string {
  const aText = input.text.trim()
  if (aText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const a = parseIntStrict(input.text)
  const bText = input.textB.trim()
  const b = bText === '' ? a : parseIntStrict(input.textB)

  const g = gcd(a, b)
  const l = lcm(a, b)

  const lines = [
    `整数 A：${a.toString()}`,
    `整数 B：${b.toString()}`,
    `最大公约数（GCD）：${g.toString()}`,
    `最小公倍数（LCM）：${l.toString()}`,
    g === 1n && a !== 0n && b !== 0n ? '互质：是（GCD = 1）' : '互质：否',
  ]
  return lines.join('\n')
}
