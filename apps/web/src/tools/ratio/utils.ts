import type { RatioInput, RatioOptions } from './schema'

export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = x % y
    x = y
    y = t
  }
  return x
}

export function gcdAll(values: number[]): number {
  return values.reduce((g, v) => gcd(g, v), 0)
}

/** 去浮点噪声：整数原样输出，小数保留至多 12 位有效数字 */
export function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(parseFloat(n.toPrecision(12)))
}

/**
 * 解析比例串：`12:18`、`12：18`（全角冒号亦可），至少 2 项。
 * 小数项按最大小数位数放大为整数，保证化简精确。
 */
export function parseRatio(text: string): number[] {
  const t = text.trim()
  if (t === '') throw new Error('比例不能为空')
  const parts = t
    .split(/[:：]/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
  if (parts.length < 2) throw new Error('比例至少需要两项，用冒号分隔，如 12:18')
  const values = parts.map((p) => {
    const n = Number(p.replace(/,/g, ''))
    if (!Number.isFinite(n)) throw new Error('不是有效数字：' + p)
    return n
  })
  if (values.every((v) => v === 0)) throw new Error('比例各项不能全为 0')
  return values
}

/** 化简比例：各项除以最大公约数（小数先放大为整数） */
export function simplifyRatio(values: number[]): number[] {
  const decimals = values.map((v) => {
    const s = String(v)
    const i = s.indexOf('.')
    return i < 0 ? 0 : s.length - i - 1
  })
  const scale = 10 ** Math.max(...decimals)
  const ints = values.map((v) => Math.round(v * scale))
  const g = gcdAll(ints)
  if (g === 0) throw new Error('比例各项不能全为 0')
  return ints.map((v) => v / g)
}

/** 解比例方程 a:b = c:x，求 x */
export function solveProportion(a: number, b: number, c: number): number {
  if (a === 0) throw new Error('a 不能为 0（除数不能为 0）')
  return (b * c) / a
}

/** 按比例分配总数，返回每项份额 */
export function splitByRatio(values: number[], total: number): number[] {
  const sum = values.reduce((s, v) => s + v, 0)
  if (sum === 0) throw new Error('比例各项之和不能为 0')
  return values.map((v) => (v / sum) * total)
}

export function joinRatio(values: number[]): string {
  return values.map(fmt).join(' : ')
}

function parseSecond(raw: string, name: string): number {
  const t = raw.trim().replace(/,/g, '')
  if (t === '') throw new Error(name + '不能为空')
  const n = Number(t)
  if (!Number.isFinite(n)) throw new Error('不是有效数字：' + raw.trim())
  return n
}

/** T3 同步入口（toText 用） */
export function transform(input: RatioInput, options: RatioOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const mode = options.mode ?? 'simplify'
  const values = parseRatio(text)

  if (mode === 'simplify') {
    const simple = simplifyRatio(values)
    return [`${joinRatio(values)} = ${joinRatio(simple)}`, `最简比例：${joinRatio(simple)}`].join(
      '\n',
    )
  }
  if (mode === 'solve') {
    if (values.length !== 2) throw new Error('解比例方程需要恰好两项，如 2:3')
    const c = parseSecond(input.textB, '已知项 c')
    const x = solveProportion(values[0], values[1], c)
    return [
      `${joinRatio(values)} = ${fmt(c)} : x`,
      `x = ${fmt(values[1])} × ${fmt(c)} ÷ ${fmt(values[0])} = ${fmt(x)}`,
    ].join('\n')
  }
  const total = parseSecond(input.textB, '总数')
  const shares = splitByRatio(values, total)
  const lines = [`总数 ${fmt(total)} 按 ${joinRatio(values)} 分配：`]
  shares.forEach((s, i) => {
    lines.push(`第 ${i + 1} 项：${fmt(s)}`)
  })
  return lines.join('\n')
}
