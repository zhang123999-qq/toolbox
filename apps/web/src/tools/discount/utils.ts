import type { DiscountInput, DiscountOptions } from './schema'

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
const fmt = (n: number): string => Number(n.toPrecision(12)).toString()

/** 金额格式化：保留 2 位小数 */
const money = (n: number): string => n.toFixed(2)

/** 解析正数：NaN 或 <= 0 时抛中文错误 */
export function parsePositive(raw: string, what: string): number {
  const n = Number(raw.trim())
  if (Number.isNaN(n)) throw new Error(what + '请输入有效的数字')
  if (n <= 0) throw new Error(what + '必须大于 0')
  return n
}

/** T2 同步入口 */
export function transform(input: DiscountInput, options: DiscountOptions): string {
  const text = input.text.trim()
  if (text === '') return ''

  const price = parsePositive(text, '原价')
  const mode = options.mode
  const textB = input.textB.trim()

  if (mode === '按折扣率') {
    if (textB === '') throw new Error('折扣不能为空')
    const rate = Number(textB)
    if (Number.isNaN(rate)) throw new Error('折扣请输入有效的数字')
    if (rate <= 0 || rate > 10) throw new Error('折扣应在 0 到 10 之间（如 8.5 表示 8.5 折）')
    const finalPrice = (price * rate) / 10
    const saving = price - finalPrice
    return [
      '原价：' + money(price) + ' 元',
      '折扣：' + fmt(rate) + ' 折',
      '折后价：' + money(finalPrice) + ' 元',
      '节省：' + money(saving) + ' 元',
    ].join('\n')
  }

  if (mode === '按折后价') {
    if (textB === '') throw new Error('折后价不能为空')
    const finalPrice = Number(textB)
    if (Number.isNaN(finalPrice)) throw new Error('折后价请输入有效的数字')
    if (finalPrice <= 0) throw new Error('折后价必须大于 0')
    if (finalPrice > price) throw new Error('折后价不能高于原价')
    const rate = (finalPrice / price) * 10
    const saving = price - finalPrice
    return [
      '原价：' + money(price) + ' 元',
      '折扣：' + fmt(rate) + ' 折',
      '折后价：' + money(finalPrice) + ' 元',
      '节省：' + money(saving) + ' 元',
    ].join('\n')
  }

  throw new Error('未知计算方式')
}
