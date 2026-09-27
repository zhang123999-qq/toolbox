import { Decimal } from 'decimal.js'
import type { InterestInput, InterestOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

export type InterestType = '单利' | '复利'

export interface InterestResult {
  readonly type: InterestType
  readonly principal: Decimal
  readonly annualRate: Decimal
  readonly years: Decimal
  readonly interest: Decimal
  readonly maturity: Decimal
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
 * 利息计算（纯函数，decimal.js 保精度）。
 * - 单利：利息 = P·r·t
 * - 复利（年复利）：本息和 = P·(1+r)^t，利息 = 本息和 − P
 * text（本金）留空 → 返回 null（上层渲染空态，不报错）
 */
export function computeInterest(
  input: InterestInput,
  options: InterestOptions,
): InterestResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  if (parsedInput.text.trim() === '') return null

  const principal = parseNonNegative(parsedInput.text, '本金', false)
  const annualRate = parseNonNegative(parsedInput.annualRate, '年利率', true)
  const years = parseNonNegative(parsedInput.termYears, '期限', false)
  const type: InterestType = parsedOptions.interestType

  const r = annualRate.div(100)
  const maturity =
    type === '单利' ? principal.mul(r.mul(years).plus(1)) : principal.mul(r.plus(1).pow(years))
  const interest = maturity.minus(principal)
  return { type, principal, annualRate, years, interest, maturity }
}

/** 金额格式化：千分位 + 保留 2 位小数 */
export function formatMoney(value: Decimal): string {
  const fixed = value.toFixed(2)
  const dot = fixed.indexOf('.')
  const int = dot === -1 ? fixed : fixed.slice(0, dot)
  const dec = dot === -1 ? '00' : fixed.slice(dot + 1)
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec
}

/** 纯文本版本（复制 / 下载用）；本金留空 → 空串 */
export function transform(input: InterestInput, options: InterestOptions): string {
  const result = computeInterest(input, options)
  if (!result) return ''
  return [
    `计息方式：${result.type}${result.type === '复利' ? '（年复利）' : ''}`,
    `本金：${formatMoney(result.principal)} 元`,
    `年利率：${result.annualRate.toString()}% 期限：${result.years.toString()} 年`,
    `利息：${formatMoney(result.interest)} 元`,
    `本息和：${formatMoney(result.maturity)} 元`,
  ].join('\n')
}
