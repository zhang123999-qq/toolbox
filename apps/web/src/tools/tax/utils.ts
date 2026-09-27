import { Decimal } from 'decimal.js'
import type { TaxInput, TaxOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

export type TaxDirection = '含税价 → 不含税' | '不含税价 → 含税'

export interface TaxResult {
  readonly direction: TaxDirection
  readonly amount: Decimal
  readonly rate: Decimal
  readonly inclusive: Decimal
  readonly exclusive: Decimal
  readonly tax: Decimal
}

/** 解析必填非负数；空 / 非法 / <0 抛中文错误（allowZero 时 0 合法） */
function parseNonNegative(raw: string, name: string, allowZero: boolean): Decimal {
  const s = raw.trim()
  if (s === '') throw new Error(`请填写${name}`)
  let value: Decimal
  try {
    value = new Decimal(s)
  } catch {
    throw new Error(`${name}无效：${raw}（须为数字）`)
  }
  if (!value.isFinite()) throw new Error(`${name}无效：${raw}（须为数字）`)
  if (value.lt(0) || (!allowZero && value.isZero())) throw new Error(`${name}须大于 0`)
  return value
}

/**
 * 税率计算（纯函数，decimal.js 保精度）。
 * - 含税价 → 不含税：不含税 = 含税 / (1+r)，税额 = 含税 − 不含税
 * - 不含税价 → 含税：含税 = 不含税 × (1+r)，税额 = 含税 − 不含税
 * text（金额）留空 → 返回 null（上层渲染空态，不报错）
 */
export function computeTax(input: TaxInput, options: TaxOptions): TaxResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  if (parsedInput.text.trim() === '') return null

  const amount = parseNonNegative(parsedInput.text, '金额', false)
  const rate = parseNonNegative(parsedInput.taxRate, '税率', true)
  const direction: TaxDirection = parsedOptions.taxDirection

  const factor = rate.div(100).plus(1)
  const inclusive = direction === '含税价 → 不含税' ? amount : amount.mul(factor)
  const exclusive = direction === '含税价 → 不含税' ? amount.div(factor) : amount
  return { direction, amount, rate, inclusive, exclusive, tax: inclusive.minus(exclusive) }
}

/** 金额格式化：千分位 + 保留 2 位小数 */
export function formatMoney(value: Decimal): string {
  const fixed = value.toFixed(2)
  const dot = fixed.indexOf('.')
  const int = dot === -1 ? fixed : fixed.slice(0, dot)
  const dec = dot === -1 ? '00' : fixed.slice(dot + 1)
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec
}

/** 纯文本版本（复制 / 下载用）；金额留空 → 空串 */
export function transform(input: TaxInput, options: TaxOptions): string {
  const result = computeTax(input, options)
  if (!result) return ''
  return [
    `换算方向：${result.direction}`,
    `税率：${result.rate.toString()}%`,
    `不含税价：${formatMoney(result.exclusive)} 元`,
    `税额：${formatMoney(result.tax)} 元`,
    `含税价：${formatMoney(result.inclusive)} 元`,
  ].join('\n')
}
