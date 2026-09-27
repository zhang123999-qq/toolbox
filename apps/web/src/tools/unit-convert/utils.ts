import type { UnitConvertInput, UnitConvertOptions } from './schema'

/** 各单位换算到所属类别基准单位的倍数（温度走摄氏度中转的专用公式，不在这里） */
export const UNITS: Record<string, { factor: number }> = {
  // 长度（基准：米）
  mm: { factor: 0.001 },
  cm: { factor: 0.01 },
  m: { factor: 1 },
  km: { factor: 1000 },
  in: { factor: 0.0254 },
  ft: { factor: 0.3048 },
  yd: { factor: 0.9144 },
  mi: { factor: 1609.344 },
  nmi: { factor: 1852 },
  // 重量（基准：千克）
  mg: { factor: 1e-6 },
  g: { factor: 0.001 },
  kg: { factor: 1 },
  t: { factor: 1000 },
  斤: { factor: 0.5 },
  oz: { factor: 0.028349523125 },
  lb: { factor: 0.45359237 },
  // 面积（基准：平方米）
  'cm²': { factor: 0.0001 },
  'm²': { factor: 1 },
  ha: { factor: 10000 },
  'km²': { factor: 1e6 },
  亩: { factor: 666.6666667 },
  'ft²': { factor: 0.09290304 },
  acre: { factor: 4046.8564224 },
  // 体积（基准：升）
  ml: { factor: 0.001 },
  l: { factor: 1 },
  'm³': { factor: 1000 },
  gal: { factor: 3.785411784 },
  'fl-oz': { factor: 0.0295735295625 },
  // 速度（基准：米/秒）
  'm/s': { factor: 1 },
  'km/h': { factor: 1 / 3.6 },
  mph: { factor: 0.44704 },
  'ft/s': { factor: 0.3048 },
  knot: { factor: 0.514444 },
}

/** 单位 → 所属类别 */
const CATEGORY: Record<string, string> = {
  mm: '长度',
  cm: '长度',
  m: '长度',
  km: '长度',
  in: '长度',
  ft: '长度',
  yd: '长度',
  mi: '长度',
  nmi: '长度',
  mg: '重量',
  g: '重量',
  kg: '重量',
  t: '重量',
  斤: '重量',
  oz: '重量',
  lb: '重量',
  'cm²': '面积',
  'm²': '面积',
  ha: '面积',
  'km²': '面积',
  亩: '面积',
  'ft²': '面积',
  acre: '面积',
  ml: '体积',
  l: '体积',
  'm³': '体积',
  gal: '体积',
  'fl-oz': '体积',
  'm/s': '速度',
  'km/h': '速度',
  mph: '速度',
  'ft/s': '速度',
  knot: '速度',
  C: '温度',
  F: '温度',
  K: '温度',
}

/** 所有单位 id（按类别分组，供下拉框用） */
export const UNIT_IDS: readonly string[] = [
  'mm',
  'cm',
  'm',
  'km',
  'in',
  'ft',
  'yd',
  'mi',
  'nmi',
  'mg',
  'g',
  'kg',
  't',
  '斤',
  'oz',
  'lb',
  'cm²',
  'm²',
  'ha',
  'km²',
  '亩',
  'ft²',
  'acre',
  'ml',
  'l',
  'm³',
  'gal',
  'fl-oz',
  'm/s',
  'km/h',
  'mph',
  'ft/s',
  'knot',
  'C',
  'F',
  'K',
]

/** 去浮点噪声、去尾零 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** 任意温度单位 → 摄氏度（附绝对零度校验） */
function toCelsius(value: number, unit: string): number {
  if (unit === 'C') {
    if (value < -273.15) throw new Error('低于绝对零度，物理上不可能')
    return value
  }
  if (unit === 'F') {
    if (value < -459.67) throw new Error('低于绝对零度，物理上不可能')
    return ((value - 32) * 5) / 9
  }
  // K
  if (value < 0) throw new Error('低于绝对零度，物理上不可能')
  return value - 273.15
}

/** 摄氏度 → 任意温度单位 */
function fromCelsius(celsius: number, unit: string): number {
  if (unit === 'C') return celsius
  if (unit === 'F') return (celsius * 9) / 5 + 32
  return celsius + 273.15
}

/** T2 同步入口 */
export function transform(input: UnitConvertInput, options: UnitConvertOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const { from, to } = options
  const catFrom = CATEGORY[from]
  const catTo = CATEGORY[to]
  if (!catFrom || !catTo) throw new Error('未知单位')
  if (catFrom !== catTo) throw new Error(`单位类别不一致：${catFrom}单位不能换算为${catTo}单位`)
  const value = Number(text)
  if (Number.isNaN(value)) throw new Error('请输入有效的数字')
  const result =
    catFrom === '温度'
      ? fromCelsius(toCelsius(value, from), to)
      : (value * UNITS[from].factor) / UNITS[to].factor
  return `${text} ${from} = ${fmt(result)} ${to}`
}
