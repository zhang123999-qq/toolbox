import type { PowerInput, PowerOptions } from './schema'

/**
 * 各单位换算到基准单位（瓦特 W）的倍数
 * 注：hp 为英制马力（746 W），PS 为公制马力（735.49875 W）
 */
export const UNITS: Record<string, { factor: number }> = {
  W: { factor: 1 },
  mW: { factor: 0.001 },
  kW: { factor: 1000 },
  MW: { factor: 1e6 },
  hp: { factor: 745.699872 },
  PS: { factor: 735.49875 },
  'BTU/h': { factor: 0.29307107017 },
  'erg/s': { factor: 1e-7 },
  'kcal/h': { factor: 1.163 },
  'ft·lb/s': { factor: 1.355817948 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: PowerInput, options: PowerOptions): string {
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
