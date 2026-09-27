import { describe, expect, it } from 'vitest'
import { computeLoan, formatMoney, transform } from './utils'
import { Decimal } from 'decimal.js'

const installment = { repayMethod: '等额本息' } as const
const principal = { repayMethod: '等额本金' } as const

describe('loan / utils', () => {
  it('本金留空 → null / 空串（不进入错误态）', () => {
    expect(computeLoan({ text: '', annualRate: '', years: '' }, installment)).toBeNull()
    expect(transform({ text: '   ', annualRate: '', years: '' }, installment)).toBe('')
  })

  it('等额本息：100 万 / 4.9% / 20 年', () => {
    const result = computeLoan({ text: '1000000', annualRate: '4.9', years: '20' }, installment)
    expect(result?.method).toBe('等额本息')
    expect(result?.periods).toBe(240)
    expect(result?.monthlyPayment.toFixed(2)).toBe('6544.44')
    expect(result?.totalInterest.toFixed(2)).toBe('570665.72')
    expect(result?.totalPayment.toFixed(2)).toBe('1570665.72')
  })

  it('等额本金：100 万 / 4.9% / 20 年', () => {
    const result = computeLoan({ text: '1000000', annualRate: '4.9', years: '20' }, principal)
    expect(result?.firstPayment?.toFixed(2)).toBe('8250.00')
    expect(result?.lastPayment?.toFixed(2)).toBe('4183.68')
    expect(result?.monthlyDecrease?.toFixed(2)).toBe('17.01')
    expect(result?.totalInterest.toFixed(2)).toBe('492041.67')
  })

  it('零利率（免息）：月供 = 本金 / 期数', () => {
    const result = computeLoan({ text: '1000000', annualRate: '0', years: '20' }, installment)
    expect(result?.monthlyPayment.toFixed(2)).toBe('4166.67')
    expect(result?.totalInterest.toFixed(2)).toBe('0.00')
  })

  it('缺参数 / 非法参数抛中文错', () => {
    expect(() =>
      computeLoan({ text: '1000000', annualRate: '', years: '20' }, installment),
    ).toThrow(/请填写年利率/)
    expect(() => computeLoan({ text: 'abc', annualRate: '4.9', years: '20' }, installment)).toThrow(
      /贷款本金无效/,
    )
    expect(() => computeLoan({ text: '-5', annualRate: '4.9', years: '20' }, installment)).toThrow(
      /须大于 0/,
    )
  })

  it('formatMoney：千分位 + 两位小数', () => {
    expect(formatMoney(new Decimal('1570665.72'))).toBe('1,570,665.72')
    expect(formatMoney(new Decimal('8250'))).toBe('8,250.00')
  })

  it('transform 输出关键行', () => {
    const out = transform({ text: '1000000', annualRate: '4.9', years: '20' }, installment)
    expect(out).toContain('每月月供：6,544.44 元')
    expect(out).toContain('总利息：570,665.72 元')
    const out2 = transform({ text: '1000000', annualRate: '4.9', years: '20' }, principal)
    expect(out2).toContain('首月月供：8,250.00 元')
    expect(out2).toContain('末月月供：4,183.68 元')
  })
})
