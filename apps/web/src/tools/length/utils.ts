import type { LengthInput, LengthOptions } from './schema'

/** 各单位换算到基准单位（米）的倍数 */
export const UNITS: Record<string, { factor: number }> = {
  μm: { factor: 1e-6 },
  mm: { factor: 0.001 },
  cm: { factor: 0.01 },
  m: { factor: 1 },
  km: { factor: 1000 },
  in: { factor: 0.0254 },
  ft: { factor: 0.3048 },
  yd: { factor: 0.9144 },
  mi: { factor: 1609.344 },
  nmi: { factor: 1852 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: LengthInput, options: LengthOptions): string {
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
