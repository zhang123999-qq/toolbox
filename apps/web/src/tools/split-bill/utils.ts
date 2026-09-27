import type { SplitBillInput, SplitBillOptions } from './schema'

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
const fmt = (n: number): string => Number(n.toPrecision(12)).toString()

/** 金额格式化：保留 2 位小数 */
const money = (n: number): string => n.toFixed(2)

/** T2 同步入口 */
export function transform(input: SplitBillInput, options: SplitBillOptions): string {
  const text = input.text.trim()
  if (text === '') return ''

  const total = Number(text)
  if (Number.isNaN(total)) throw new Error('总金额请输入有效的数字')
  if (total <= 0) throw new Error('总金额必须大于 0')

  const textB = input.textB.trim()
  if (textB === '') throw new Error('人数不能为空')
  const n = Number(textB)
  if (Number.isNaN(n) || !Number.isInteger(n) || n < 1) {
    throw new Error('人数应为大于等于 1 的整数')
  }

  const tipRate = Number(options.tipRate)
  if (Number.isNaN(tipRate)) throw new Error('小费比例非法')

  const tip = (total * tipRate) / 100
  const grand = total + tip
  const per = grand / n
  return [
    '消费总额：' + money(total) + ' 元',
    '小费（' + fmt(tipRate) + '%）：' + money(tip) + ' 元',
    '应付总计：' + money(grand) + ' 元',
    '人均（' + n + ' 人）：' + money(per) + ' 元',
  ].join('\n')
}
