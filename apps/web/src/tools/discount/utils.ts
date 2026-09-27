import { Decimal } from 'decimal.js'
import type { DiscountInput, DiscountOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

export interface DiscountResult {
  readonly price: Decimal
  readonly rate: Decimal
  readonly quantity: Decimal
  readonly unitDiscounted: Decimal
  readonly unitSaving: Decimal
  readonly totalPayable: Decimal
  readonly totalSaving: Decimal
}

/** 解析必填正数；空 / 非法 / ≤0 抛中文错误 */
function parsePositive(raw: string, name: string): Decimal {
  const s = raw.trim()
  if (s === '') throw new Error(`请填写${name}`)
  let value: Decimal
  try {
    value = new Decimal(s)
  } catch {
    throw new Error(`${name}无效：${raw}（须为数字）`)
  }
  if (!value.isFinite()) throw new Error(`${name}无效：${raw}（须为数字）`)
  if (value.lte(0)) throw new Error(`${name}须大于 0`)
  return value
}

/** 解析折扣：0–100 的百分比，20 表示减 20%（即 8 折） */
function parseRate(raw: string): Decimal {
  const s = raw.trim()
  if (s === '') throw new Error('请填写折扣')
  let value: Decimal
  try {
    value = new Decimal(s)
  } catch {
    throw new Error(`折扣无效：${raw}（须为数字）`)
  }
  if (!value.isFinite() || value.lt(0) || value.gt(100))
    throw new Error(`折扣须在 0–100 之间：${raw}`)
  return value
}

/** 解析数量：正整数，留空=1 */
function parseQuantity(raw: string): Decimal {
  const s = raw.trim()
  if (s === '') return new Decimal(1)
  if (!/^\d+$/.test(s)) throw new Error(`数量无效：${raw}（须为正整数）`)
  const value = new Decimal(s)
  if (value.lte(0)) throw new Error('数量须为正整数')
  return value
}

/**
 * 折扣计算（纯函数，decimal.js 保精度）。
 * 折后单价 = 原价 × (1 − 折扣/100)；实付总额 = 折后单价 × 数量。
 * text（原价）留空 → 返回 null（上层渲染空态，不报错）
 */
export function computeDiscount(
  input: DiscountInput,
  _options: DiscountOptions,
): DiscountResult | null {
  const parsedInput = inputSchema.parse(input)
  optionsSchema.parse(_options)
  if (parsedInput.text.trim() === '') return null

  const price = parsePositive(parsedInput.text, '原价')
  const rate = parseRate(parsedInput.discountRate)
  const quantity = parseQuantity(parsedInput.quantity)

  const unitDiscounted = price.mul(new Decimal(1).minus(rate.div(100)))
  const unitSaving = price.minus(unitDiscounted)
  return {
    price,
    rate,
    quantity,
    unitDiscounted,
    unitSaving,
    totalPayable: unitDiscounted.mul(quantity),
    totalSaving: unitSaving.mul(quantity),
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

/** 纯文本版本（复制 / 下载用）；原价留空 → 空串 */
export function transform(input: DiscountInput, options: DiscountOptions): string {
  const result = computeDiscount(input, options)
  if (!result) return ''
  return [
    `原价：${formatMoney(result.price)} 元`,
    `折扣：${result.rate.toString()}%（${new Decimal(10).minus(result.rate.div(10)).toString()} 折）`,
    `数量：${result.quantity.toString()}`,
    `折后单价：${formatMoney(result.unitDiscounted)} 元`,
    `单件节省：${formatMoney(result.unitSaving)} 元`,
    `实付总额：${formatMoney(result.totalPayable)} 元`,
    `总共节省：${formatMoney(result.totalSaving)} 元`,
  ].join('\n')
}
