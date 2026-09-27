import { describe, expect, it } from 'vitest'
import { computeInterest, formatMoney, transform } from './utils'
import { Decimal } from 'decimal.js'

const simple = { interestType: '单利' } as const
const compound = { interestType: '复利' } as const

describe('interest / utils', () => {
  it('本金留空 → null / 空串（不进入错误态）', () => {
    expect(computeInterest({ text: '', annualRate: '', termYears: '' }, simple)).toBeNull()
    expect(transform({ text: '   ', annualRate: '', termYears: '' }, simple)).toBe('')
  })

  it('单利：10000 / 5% / 3 年', () => {
    const result = computeInterest({ text: '10000', annualRate: '5', termYears: '3' }, simple)
    expect(result?.interest.toFixed(2)).toBe('1500.00')
    expect(result?.maturity.toFixed(2)).toBe('11500.00')
  })

  it('复利（年复利）：10000 / 5% / 3 年', () => {
    const result = computeInterest({ text: '10000', annualRate: '5', termYears: '3' }, compound)
    expect(result?.interest.toFixed(2)).toBe('1576.25')
    expect(result?.maturity.toFixed(2)).toBe('11576.25')
  })

  it('复利 ≥ 单利', () => {
    const input = { text: '10000', annualRate: '5', termYears: '3' }
    const s = computeInterest(input, simple)
    const c = computeInterest(input, compound)
    expect(c!.interest.gte(s!.interest)).toBe(true)
  })

  it('零利率：利息为 0', () => {
    const result = computeInterest({ text: '10000', annualRate: '0', termYears: '3' }, compound)
    expect(result?.interest.toFixed(2)).toBe('0.00')
    expect(result?.maturity.toFixed(2)).toBe('10000.00')
  })

  it('缺参数 / 非法参数抛中文错', () => {
    expect(() =>
      computeInterest({ text: '10000', annualRate: '5', termYears: '' }, simple),
    ).toThrow(/请填写期限/)
    expect(() =>
      computeInterest({ text: '10000', annualRate: 'x', termYears: '3' }, simple),
    ).toThrow(/年利率无效/)
  })

  it('formatMoney 格式化正确', () => {
    expect(formatMoney(new Decimal('11576.25'))).toBe('11,576.25')
  })

  it('transform 输出关键行', () => {
    const out = transform({ text: '10000', annualRate: '5', termYears: '3' }, compound)
    expect(out).toContain('利息：1,576.25 元')
    expect(out).toContain('本息和：11,576.25 元')
  })
})
