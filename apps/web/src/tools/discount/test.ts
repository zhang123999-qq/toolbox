import { describe, expect, it } from 'vitest'
import { computeDiscount, formatMoney, transform } from './utils'
import { Decimal } from 'decimal.js'

const noOptions = {}

describe('discount / utils', () => {
  it('原价留空 → null / 空串（不进入错误态）', () => {
    expect(computeDiscount({ text: '', discountRate: '', quantity: '' }, noOptions)).toBeNull()
    expect(transform({ text: '   ', discountRate: '', quantity: '' }, noOptions)).toBe('')
  })

  it('原价 100 / 折扣 20% / 数量 2', () => {
    const result = computeDiscount({ text: '100', discountRate: '20', quantity: '2' }, noOptions)
    expect(result?.unitDiscounted.toFixed(2)).toBe('80.00')
    expect(result?.unitSaving.toFixed(2)).toBe('20.00')
    expect(result?.totalPayable.toFixed(2)).toBe('160.00')
    expect(result?.totalSaving.toFixed(2)).toBe('40.00')
  })

  it('数量留空 → 默认 1', () => {
    const result = computeDiscount({ text: '100', discountRate: '20', quantity: '' }, noOptions)
    expect(result?.quantity.toString()).toBe('1')
    expect(result?.totalPayable.toFixed(2)).toBe('80.00')
  })

  it('折扣 0 = 不打折，折扣 100 = 免费', () => {
    const none = computeDiscount({ text: '100', discountRate: '0', quantity: '1' }, noOptions)
    expect(none?.unitDiscounted.toFixed(2)).toBe('100.00')
    const free = computeDiscount({ text: '100', discountRate: '100', quantity: '1' }, noOptions)
    expect(free?.unitDiscounted.toFixed(2)).toBe('0.00')
  })

  it('折扣越界 / 非法数量抛中文错', () => {
    expect(() =>
      computeDiscount({ text: '100', discountRate: '120', quantity: '1' }, noOptions),
    ).toThrow(/折扣须在 0–100 之间/)
    expect(() =>
      computeDiscount({ text: '100', discountRate: '20', quantity: '1.5' }, noOptions),
    ).toThrow(/数量无效/)
    expect(() =>
      computeDiscount({ text: '100', discountRate: '', quantity: '1' }, noOptions),
    ).toThrow(/请填写折扣/)
  })

  it('formatMoney 格式化正确', () => {
    expect(formatMoney(new Decimal('1234.5'))).toBe('1,234.50')
  })

  it('transform 输出关键行（含几折）', () => {
    const out = transform({ text: '100', discountRate: '20', quantity: '2' }, noOptions)
    expect(out).toContain('折后单价：80.00 元')
    expect(out).toContain('实付总额：160.00 元')
    expect(out).toContain('8 折')
  })
})
