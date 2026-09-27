import type { AreaInput, AreaOptions } from './schema'

/** 各单位换算到基准单位（平方米）的倍数 */
export const UNITS: Record<string, { factor: number }> = {
  'cm²': { factor: 0.0001 },
  'm²': { factor: 1 },
  ha: { factor: 10000 },
  'km²': { factor: 1e6 },
  亩: { factor: 666.6666667 },
  'ft²': { factor: 0.09290304 },
  acre: { factor: 4046.8564224 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: AreaInput, options: AreaOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const from = UNITS[options.from]
  const to = UNITS[options.to]
  if (!from || !to) throw new Error('未知单位')
  const value = Number(text)
  if (Number.isNaN(value)) throw new Error('请输入有效的数字')
  const result = (value * from.factor) / to.factor
  return `${text} ${options.from} = ${fmt(result)} ${options.to}`
}
