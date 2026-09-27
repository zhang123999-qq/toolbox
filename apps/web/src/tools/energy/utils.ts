import type { EnergyInput, EnergyOptions } from './schema'

/** 各单位换算到基准单位（焦耳 J）的倍数 */
export const UNITS: Record<string, { factor: number }> = {
  J: { factor: 1 },
  kJ: { factor: 1000 },
  MJ: { factor: 1e6 },
  cal: { factor: 4.184 },
  kcal: { factor: 4184 },
  Wh: { factor: 3600 },
  kWh: { factor: 3.6e6 },
  eV: { factor: 1.602176634e-19 },
  BTU: { factor: 1055.06 },
  'ft·lb': { factor: 1.35581794833 },
  erg: { factor: 1e-7 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: EnergyInput, options: EnergyOptions): string {
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
