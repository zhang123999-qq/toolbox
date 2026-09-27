import type { SpeedInput, SpeedOptions } from './schema'

/** 单位表：factor = 换算到基准单位（米/秒 m/s）的倍数 */
export const UNITS: Record<string, { factor: number }> = {
  'm/s': { factor: 1 },
  'km/h': { factor: 1 / 3.6 },
  mph: { factor: 0.44704 },
  'ft/s': { factor: 0.3048 },
  knot: { factor: 0.514444 },
}

/** 单位 id 列表，供选项下拉用 */
export const UNIT_IDS: readonly string[] = Object.keys(UNITS)

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: SpeedInput, options: SpeedOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const value = Number(text)
  if (Number.isNaN(value)) throw new Error('请输入有效的数字')

  const from = UNITS[options.from]
  const to = UNITS[options.to]
  if (!from || !to) throw new Error('未知单位')

  const result = (value * from.factor) / to.factor
  return `${text} ${options.from} = ${fmt(result)} ${options.to}`
}
