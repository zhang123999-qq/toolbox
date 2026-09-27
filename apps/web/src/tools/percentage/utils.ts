import type { PercentageInput, PercentageOptions } from './schema'

/** 解析数字：允许千分位逗号与末尾百分号，非法输入抛中文错误 */
export function parseNumber(raw: string, name: string): number {
  const t = raw.trim().replace(/,/g, '').replace(/%$/, '')
  if (t === '') throw new Error(name + '不能为空')
  const n = Number(t)
  if (!Number.isFinite(n)) throw new Error('不是有效数字：' + raw.trim())
  return n
}

/** 去浮点噪声：整数原样输出，小数保留至多 12 位有效数字 */
export function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(parseFloat(n.toPrecision(12)))
}

export type PercentageMode = PercentageOptions['mode']

/** A 占 B 的百分之几 */
export function percentOf(a: number, b: number): { percent: number; ratio: number } {
  if (b === 0) throw new Error('B 不能为 0（除数不能为 0）')
  const ratio = a / b
  return { percent: ratio * 100, ratio }
}

/** A 的 B% 是多少 */
export function percentValue(a: number, b: number): number {
  return (a * b) / 100
}

/** 从 A 到 B 的变化率（%）；正数=增长，负数=下降 */
export function percentChange(a: number, b: number): { percent: number; delta: number } {
  if (a === 0) throw new Error('原值 A 不能为 0（除数不能为 0）')
  const delta = b - a
  return { percent: (delta / a) * 100, delta }
}

/** T3 同步入口（toText 用） */
export function transform(input: PercentageInput, options: PercentageOptions): string {
  const aText = input.text.trim()
  if (aText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const a = parseNumber(aText, '第一个数 A')
  const b = parseNumber(input.textB, '第二个数 B')
  const mode: PercentageMode = options.mode ?? 'of'

  if (mode === 'of') {
    const { percent, ratio } = percentOf(a, b)
    return [
      `${fmt(a)} 是 ${fmt(b)} 的 ${fmt(percent)}%`,
      `算式：${fmt(a)} ÷ ${fmt(b)} × 100% = ${fmt(percent)}%`,
      `小数形式：${fmt(ratio)}`,
    ].join('\n')
  }
  if (mode === 'value') {
    const v = percentValue(a, b)
    return [
      `${fmt(a)} 的 ${fmt(b)}% 是 ${fmt(v)}`,
      `算式：${fmt(a)} × ${fmt(b)}% = ${fmt(v)}`,
    ].join('\n')
  }
  const { percent, delta } = percentChange(a, b)
  const dir = percent > 0 ? '增长' : percent < 0 ? '下降' : '无变化'
  const sign = delta > 0 ? '+' : ''
  return [
    `从 ${fmt(a)} 到 ${fmt(b)}：${dir} ${fmt(Math.abs(percent))}%`,
    `算式：(${fmt(b)} − ${fmt(a)}) ÷ ${fmt(a)} × 100% = ${fmt(percent)}%`,
    `变化量：${sign}${fmt(delta)}`,
  ].join('\n')
}
