import { describe, expect, it } from 'vitest'
import { computeTax, formatMoney, transform } from './utils'
import { Decimal } from 'decimal.js'

const toExclusive = { taxDirection: '含税价 → 不含税' } as const
const toInclusive = { taxDirection: '不含税价 → 含税' } as const

describe('tax / utils', () => {
  it('金额留空 → null / 空串（不进入错误态）', () => {
    expect(computeTax({ text: '', taxRate: '' }, toExclusive)).toBeNull()
    expect(transform({ text: '   ', taxRate: '' }, toExclusive)).toBe('')
  })

  it('含税价 → 不含税：113 / 13%', () => {
    const result = computeTax({ text: '113', taxRate: '13' }, toExclusive)
    expect(result?.exclusive.toFixed(2)).toBe('100.00')
    expect(result?.tax.toFixed(2)).toBe('13.00')
    expect(result?.inclusive.toFixed(2)).toBe('113.00')
  })

  it('不含税价 → 含税：100 / 13%', () => {
    const result = computeTax({ text: '100', taxRate: '13' }, toInclusive)
    expect(result?.inclusive.toFixed(2)).toBe('113.00')
    expect(result?.tax.toFixed(2)).toBe('13.00')
    expect(result?.exclusive.toFixed(2)).toBe('100.00')
  })

  it('往返一致：含税 → 不含税 → 含税', () => {
    const a = computeTax({ text: '113', taxRate: '13' }, toExclusive)
    const b = computeTax({ text: a!.exclusive.toString(), taxRate: '13' }, toInclusive)
    expect(b?.inclusive.toFixed(2)).toBe('113.00')
  })

  it('零税率：税额为 0', () => {
    const result = computeTax({ text: '100', taxRate: '0' }, toInclusive)
    expect(result?.tax.toFixed(2)).toBe('0.00')
    expect(result?.inclusive.toFixed(2)).toBe('100.00')
  })

  it('缺参数 / 非法参数抛中文错', () => {
    expect(() => computeTax({ text: '100', taxRate: '' }, toExclusive)).toThrow(/请填写税率/)
    expect(() => computeTax({ text: '-5', taxRate: '13' }, toExclusive)).toThrow(/金额须大于 0/)
  })

  it('formatMoney 格式化正确', () => {
    expect(formatMoney(new Decimal('1234567.8'))).toBe('1,234,567.80')
  })

  it('transform 输出关键行', () => {
    const out = transform({ text: '113', taxRate: '13' }, toExclusive)
    expect(out).toContain('不含税价：100.00 元')
    expect(out).toContain('税额：13.00 元')
  })
})
