import type { VolumeInput, VolumeOptions } from './schema'

/** 单位表：factor = 换算到基准单位（升 L）的倍数 */
export const UNITS: Record<string, { factor: number }> = {
  ml: { factor: 0.001 },
  cm3: { factor: 0.001 },
  l: { factor: 1 },
  m3: { factor: 1000 },
  in3: { factor: 0.016387064 },
  ft3: { factor: 28.316846592 },
  gal: { factor: 3.785411784 }, // 美制加仑
  'fl-oz': { factor: 0.0295735295625 }, // 美制液盎司
}

/** 单位 id 列表，供选项下拉用 */
export const UNIT_IDS: readonly string[] = Object.keys(UNITS)

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: VolumeInput, options: VolumeOptions): string {
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
