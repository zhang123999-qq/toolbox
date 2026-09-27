import { Decimal } from 'decimal.js'
import type { LoanInput, LoanOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

export type RepayMethod = '等额本息' | '等额本金'

export interface LoanResult {
  readonly method: RepayMethod
  readonly principal: Decimal
  readonly annualRate: Decimal
  readonly years: Decimal
  readonly periods: number
  /** 等额本息=每月月供；等额本金=首月月供 */
  readonly monthlyPayment: Decimal
  readonly firstPayment?: Decimal
  readonly lastPayment?: Decimal
  readonly monthlyDecrease?: Decimal
  readonly totalPayment: Decimal
  readonly totalInterest: Decimal
}

/** 解析必填正数；空 / 非法 / ≤0 抛中文错误（allowZero 时 0 合法） */
function parsePositive(raw: string, name: string, allowZero = false): Decimal {
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
 * 贷款计算（纯函数，decimal.js 保精度）。
 * - 等额本息：月供 = P·r·(1+r)^n / ((1+r)^n − 1)，r=月利率，n=总期数
 * - 等额本金：每月还本金 P/n，首月利息 P·r，末月利息 (P/n)·r，
 *   总利息 = P·r·(n+1)/2
 * text（本金）留空 → 返回 null（上层渲染空态，不报错）
 */
export function computeLoan(input: LoanInput, options: LoanOptions): LoanResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  if (parsedInput.text.trim() === '') return null

  const principal = parsePositive(parsedInput.text, '贷款本金')
  const annualRate = parsePositive(parsedInput.annualRate, '年利率', true)
  const years = parsePositive(parsedInput.years, '贷款年限')
  const method: RepayMethod = parsedOptions.repayMethod
  const periods = Math.round(years.mul(12).toNumber())
  if (periods < 1) throw new Error('贷款年限过小，换算期数不足 1 期')

  const r = annualRate.div(100).div(12)

  if (method === '等额本息') {
    let monthly: Decimal
    if (r.isZero()) {
      monthly = principal.div(periods)
    } else {
      const pow = r.plus(1).pow(periods)
      monthly = principal.mul(r).mul(pow).div(pow.minus(1))
    }
    const totalPayment = monthly.mul(periods)
    return {
      method,
      principal,
      annualRate,
      years,
      periods,
      monthlyPayment: monthly,
      totalPayment,
      totalInterest: totalPayment.minus(principal),
    }
  }

  // 等额本金
  const monthlyPrincipal = principal.div(periods)
  const firstPayment = monthlyPrincipal.plus(principal.mul(r))
  const lastPayment = monthlyPrincipal.plus(monthlyPrincipal.mul(r))
  const monthlyDecrease = monthlyPrincipal.mul(r)
  const totalInterest = principal
    .mul(r)
    .mul(periods + 1)
    .div(2)
  return {
    method,
    principal,
    annualRate,
    years,
    periods,
    monthlyPayment: firstPayment,
    firstPayment,
    lastPayment,
    monthlyDecrease,
    totalPayment: principal.plus(totalInterest),
    totalInterest,
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
export function transform(input: LoanInput, options: LoanOptions): string {
  const result = computeLoan(input, options)
  if (!result) return ''
  const lines = [
    `还款方式：${result.method}`,
    `贷款本金：${formatMoney(result.principal)} 元`,
    `年利率：${result.annualRate.toString()}% 贷款年限：${result.years.toString()} 年（${result.periods} 期）`,
  ]
  if (result.method === '等额本息') {
    lines.push(`每月月供：${formatMoney(result.monthlyPayment)} 元`)
  } else {
    lines.push(
      `首月月供：${formatMoney(result.firstPayment as Decimal)} 元`,
      `末月月供：${formatMoney(result.lastPayment as Decimal)} 元`,
      `每月递减：${formatMoney(result.monthlyDecrease as Decimal)} 元`,
    )
  }
  lines.push(
    `总利息：${formatMoney(result.totalInterest)} 元`,
    `总还款：${formatMoney(result.totalPayment)} 元`,
  )
  return lines.join('\n')
}
