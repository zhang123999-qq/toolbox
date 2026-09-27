import { Decimal } from 'decimal.js'
import type { CompoundInterestInput, CompoundInterestOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

export type CompoundFreq = '每年' | '每半年' | '每季度' | '每月' | '每天'

/** 复利频率 → 每年复利次数 */
export const TIMES_PER_YEAR: Record<CompoundFreq, number> = {
  每年: 1,
  每半年: 2,
  每季度: 4,
  每月: 12,
  每天: 365,
}

export interface CompoundInterestResult {
  readonly principal: Decimal
  readonly annualRate: Decimal
  readonly years: Decimal
  readonly frequency: CompoundFreq
  readonly timesPerYear: number
  readonly futureValue: Decimal
  readonly totalInterest: Decimal
}

/** 解析必填非负数；空 / 非法 / <0 抛中文错误（allowZero 恒为真：利率可为 0） */
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
 * 复利计算（纯函数，decimal.js 保精度）。
 * 本息和 A = P·(1 + r/n)^(n·t)，r=年利率，n=每年复利次数，t=年限。
 * text（本金）留空 → 返回 null（上层渲染空态，不报错）
 */
export function computeCompound(
  input: CompoundInterestInput,
  options: CompoundInterestOptions,
): CompoundInterestResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  if (parsedInput.text.trim() === '') return null

  const principal = parseNonNegative(parsedInput.text, '本金', false)
  const annualRate = parseNonNegative(parsedInput.annualRate, '年利率', true)
  const years = parseNonNegative(parsedInput.years, '年限', false)
  const frequency: CompoundFreq = parsedOptions.compoundFreq
  const n = TIMES_PER_YEAR[frequency]

  const r = annualRate.div(100)
  const base = r.div(n).plus(1)
  const exponent = new Decimal(n).mul(years)
  const futureValue = principal.mul(base.pow(exponent))
  return {
    principal,
    annualRate,
    years,
    frequency,
    timesPerYear: n,
    futureValue,
    totalInterest: futureValue.minus(principal),
  }
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
export function transform(input: CompoundInterestInput, options: CompoundInterestOptions): string {
  const result = computeCompound(input, options)
  if (!result) return ''
  return [
    `复利频率：${result.frequency}（${result.timesPerYear} 次/年）`,
    `本金：${formatMoney(result.principal)} 元`,
    `年利率：${result.annualRate.toString()}% 年限：${result.years.toString()} 年`,
    `本息和：${formatMoney(result.futureValue)} 元`,
    `总利息：${formatMoney(result.totalInterest)} 元`,
  ].join('\n')
}
