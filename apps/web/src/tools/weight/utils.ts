import type { WeightInput, WeightOptions } from './schema'

/** 各单位换算到基准单位（千克）的倍数 */
export const UNITS: Record<string, { factor: number }> = {
  mg: { factor: 1e-6 },
  g: { factor: 0.001 },
  kg: { factor: 1 },
  t: { factor: 1000 },
  斤: { factor: 0.5 },
  oz: { factor: 0.028349523125 },
  lb: { factor: 0.45359237 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: WeightInput, options: WeightOptions): string {
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
