import type { TipInput, TipOptions } from './schema'

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
const fmt = (n: number): string => Number(n.toPrecision(12)).toString()

/** 金额格式化：保留 2 位小数 */
const money = (n: number): string => n.toFixed(2)

/** T2 同步入口 */
export function transform(input: TipInput, options: TipOptions): string {
  const text = input.text.trim()
  if (text === '') return ''

  const amount = Number(text)
  if (Number.isNaN(amount)) throw new Error('账单金额请输入有效的数字')
  if (amount <= 0) throw new Error('账单金额必须大于 0')

  const rate = Number(options.rate)
  if (Number.isNaN(rate) || rate <= 0 || rate > 100) throw new Error('小费比例应在 0 到 100 之间')

  const peopleRaw = options.people.trim()
  const people = peopleRaw === '' ? 1 : Number(peopleRaw)
  if (Number.isNaN(people) || !Number.isInteger(people) || people < 1) {
    throw new Error('人数应为大于等于 1 的整数')
  }

  const tipAmount = (amount * rate) / 100
  const total = amount + tipAmount
  const per = total / people
  return [
    '账单金额：' + money(amount) + ' 元',
    '小费（' + fmt(rate) + '%）：' + money(tipAmount) + ' 元',
    '总计：' + money(total) + ' 元',
    '人均（' + people + ' 人）：' + money(per) + ' 元',
  ].join('\n')
}
