import { describe, expect, it } from 'vitest'
import { computeCompound, formatMoney, transform, TIMES_PER_YEAR } from './utils'
import { Decimal } from 'decimal.js'

const yearly = { compoundFreq: '每年' } as const
const monthly = { compoundFreq: '每月' } as const

describe('compound-interest / utils', () => {
  it('本金留空 → null / 空串（不进入错误态）', () => {
    expect(computeCompound({ text: '', annualRate: '', years: '' }, yearly)).toBeNull()
    expect(transform({ text: '   ', annualRate: '', years: '' }, yearly)).toBe('')
  })

  it('每年复利：10000 / 5% / 10 年', () => {
    const result = computeCompound({ text: '10000', annualRate: '5', years: '10' }, yearly)
    expect(result?.futureValue.toFixed(2)).toBe('16288.95')
    expect(result?.totalInterest.toFixed(2)).toBe('6288.95')
    expect(result?.timesPerYear).toBe(1)
  })

  it('每月复利高于每年复利', () => {
    const m = computeCompound({ text: '10000', annualRate: '5', years: '10' }, monthly)
    const y = computeCompound({ text: '10000', annualRate: '5', years: '10' }, yearly)
    expect(m?.futureValue.toFixed(2)).toBe('16470.09')
    expect(m!.futureValue.gt(y!.futureValue)).toBe(true)
  })

  it('频率映射正确', () => {
    expect(TIMES_PER_YEAR).toEqual({ 每年: 1, 每半年: 2, 每季度: 4, 每月: 12, 每天: 365 })
  })

  it('零利率：本息和 = 本金', () => {
    const result = computeCompound({ text: '10000', annualRate: '0', years: '10' }, monthly)
    expect(result?.futureValue.toFixed(2)).toBe('10000.00')
    expect(result?.totalInterest.toFixed(2)).toBe('0.00')
  })

  it('缺参数 / 非法参数抛中文错', () => {
    expect(() => computeCompound({ text: '10000', annualRate: '', years: '10' }, yearly)).toThrow(
      /请填写年利率/,
    )
    expect(() => computeCompound({ text: '10000', annualRate: '5', years: '-3' }, yearly)).toThrow(
      /年限须大于 0/,
    )
  })

  it('formatMoney 格式化正确', () => {
    expect(formatMoney(new Decimal('16288.95'))).toBe('16,288.95')
  })

  it('transform 输出关键行', () => {
    const out = transform({ text: '10000', annualRate: '5', years: '10' }, yearly)
    expect(out).toContain('本息和：16,288.95 元')
    expect(out).toContain('总利息：6,288.95 元')
  })
})
