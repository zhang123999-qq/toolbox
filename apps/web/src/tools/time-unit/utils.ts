import type { TimeUnitInput, TimeUnitOptions } from './schema'

/**
 * 各单位换算到基准单位（秒 s）的倍数
 * 注：month 取平均月长 30.4375 天（= 365.25/12），year 取回归年 365.25 天
 */
export const UNITS: Record<string, { factor: number }> = {
  ns: { factor: 1e-9 },
  μs: { factor: 1e-6 },
  ms: { factor: 0.001 },
  s: { factor: 1 },
  min: { factor: 60 },
  h: { factor: 3600 },
  day: { factor: 86400 },
  week: { factor: 604800 },
  month: { factor: 2629800 },
  year: { factor: 31557600 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: TimeUnitInput, options: TimeUnitOptions): string {
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
