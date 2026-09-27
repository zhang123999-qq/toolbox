import type { AngleInput, AngleOptions } from './schema'

/**
 * 各单位换算到基准单位（度 deg）的倍数
 * 注：mil 为北约密位（6400 mil = 1 圈）
 */
export const UNITS: Record<string, { factor: number }> = {
  deg: { factor: 1 },
  rad: { factor: 180 / Math.PI },
  grad: { factor: 0.9 },
  turn: { factor: 360 },
  arcmin: { factor: 1 / 60 },
  arcsec: { factor: 1 / 3600 },
  mil: { factor: 0.05625 },
}

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** T2 同步入口 */
export function transform(input: AngleInput, options: AngleOptions): string {
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
