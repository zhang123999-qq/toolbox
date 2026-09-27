import type { TemperatureInput, TemperatureOptions } from './schema'

/** 单位 id 列表，供选项下拉用 */
export const UNIT_IDS: readonly string[] = ['C', 'F', 'K']

/** 任意单位 → 摄氏度 */
export function toCelsius(v: number, from: string): number {
  if (from === 'C') return v
  if (from === 'F') return ((v - 32) * 5) / 9
  if (from === 'K') return v - 273.15
  throw new Error('未知单位')
}

/** 摄氏度 → 目标单位 */
export function fromCelsius(c: number, to: string): number {
  if (to === 'C') return c
  if (to === 'F') return (c * 9) / 5 + 32
  if (to === 'K') return c + 273.15
  throw new Error('未知单位')
}

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: TemperatureInput, options: TemperatureOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const value = Number(text)
  if (Number.isNaN(value)) throw new Error('请输入有效的数字')

  const { from, to } = options
  if (!UNIT_IDS.includes(from) || !UNIT_IDS.includes(to)) throw new Error('未知单位')

  // 绝对零度校验（换算前对输入做）：低于它在物理上不可能
  if (from === 'C' && value < -273.15) throw new Error('低于绝对零度，物理上不可能')
  if (from === 'F' && value < -459.67) throw new Error('低于绝对零度，物理上不可能')
  if (from === 'K' && value < 0) throw new Error('低于绝对零度，物理上不可能')

  const result = fromCelsius(toCelsius(value, from), to)
  return `${text} ${from} = ${fmt(result)} ${to}`
}
