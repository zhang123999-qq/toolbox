import { describe, expect, it } from 'vitest'
import { lookupBracket, transform } from './utils'

describe('income-tax / lookupBracket · 7 个档位', () => {
  it('0 命中第 1 档（3%，速算扣除 0）', () => {
    expect(lookupBracket(0)).toEqual({ pct: 3, quick: 0 })
  })

  it('第 1 档：1000 → 3% / 0', () => {
    expect(lookupBracket(1000)).toEqual({ pct: 3, quick: 0 })
  })

  it('边界 3000 仍属第 1 档', () => {
    expect(lookupBracket(3000)).toEqual({ pct: 3, quick: 0 })
  })

  it('第 2 档（10%，速算扣除 210）：3000.01', () => {
    expect(lookupBracket(3000.01)).toEqual({ pct: 10, quick: 210 })
  })

  it('第 2 档：8000', () => {
    expect(lookupBracket(8000)).toEqual({ pct: 10, quick: 210 })
  })

  it('边界 12000 仍属第 2 档', () => {
    expect(lookupBracket(12000)).toEqual({ pct: 10, quick: 210 })
  })

  it('第 3 档（20%，速算扣除 1410）：12000.01', () => {
    expect(lookupBracket(12000.01)).toEqual({ pct: 20, quick: 1410 })
  })

  it('边界 25000 仍属第 3 档', () => {
    expect(lookupBracket(25000)).toEqual({ pct: 20, quick: 1410 })
  })

  it('第 4 档（25%，速算扣除 2660）：25000.01', () => {
    expect(lookupBracket(25000.01)).toEqual({ pct: 25, quick: 2660 })
  })

  it('边界 35000 仍属第 4 档', () => {
    expect(lookupBracket(35000)).toEqual({ pct: 25, quick: 2660 })
  })

  it('第 5 档（30%，速算扣除 4410）：35000.01', () => {
    expect(lookupBracket(35000.01)).toEqual({ pct: 30, quick: 4410 })
  })

  it('边界 55000 仍属第 5 档', () => {
    expect(lookupBracket(55000)).toEqual({ pct: 30, quick: 4410 })
  })

  it('第 6 档（35%，速算扣除 7160）：55000.01', () => {
    expect(lookupBracket(55000.01)).toEqual({ pct: 35, quick: 7160 })
  })

  it('边界 80000 仍属第 6 档', () => {
    expect(lookupBracket(80000)).toEqual({ pct: 35, quick: 7160 })
  })

  it('第 7 档（45%，速算扣除 15160）：80000.01', () => {
    expect(lookupBracket(80000.01)).toEqual({ pct: 45, quick: 15160 })
  })

  it('第 7 档：100000', () => {
    expect(lookupBracket(100000)).toEqual({ pct: 45, quick: 15160 })
  })
})

describe('income-tax / transform · 完整输出', () => {
  it('10000 → 10% 档，应缴 790.00', () => {
    expect(transform({ text: '10000' }, {})).toBe(
      [
        '应纳税所得额：10000.00 元',
        '适用税率：10%',
        '速算扣除数：210.00 元',
        '应缴个人所得税：790.00 元',
      ].join('\n'),
    )
  })

  it('0 → 个税为 0', () => {
    expect(transform({ text: '0' }, {})).toBe(
      [
        '应纳税所得额：0.00 元',
        '适用税率：3%',
        '速算扣除数：0.00 元',
        '应缴个人所得税：0.00 元',
      ].join('\n'),
    )
  })

  it('边界 3000 → 3% 档，应缴 90.00', () => {
    expect(transform({ text: '3000' }, {})).toBe(
      [
        '应纳税所得额：3000.00 元',
        '适用税率：3%',
        '速算扣除数：0.00 元',
        '应缴个人所得税：90.00 元',
      ].join('\n'),
    )
  })

  it('边界 80000 → 35% 档，应缴 20840.00', () => {
    expect(transform({ text: '80000' }, {})).toBe(
      [
        '应纳税所得额：80000.00 元',
        '适用税率：35%',
        '速算扣除数：7160.00 元',
        '应缴个人所得税：20840.00 元',
      ].join('\n'),
    )
  })

  it('80000.01 → 45% 档，应缴 20840.00（小数位舍入）', () => {
    const out = transform({ text: '80000.01' }, {})
    expect(out).toContain('适用税率：45%')
    expect(out).toContain('速算扣除数：15160.00 元')
    expect(out).toContain('应缴个人所得税：20840.00 元')
  })

  it('带空格的输入自动 trim', () => {
    expect(transform({ text: '  10000  ' }, {})).toContain('应缴个人所得税：790.00 元')
  })
})

describe('income-tax / transform · 异常与边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
    expect(transform({ text: '   ' }, {})).toBe('')
  })

  it('输入超过 200,000 字符报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, {})).toThrow(/输入超过 200,000 字符上限/)
  })

  it('非数字报错', () => {
    expect(() => transform({ text: 'abc' }, {})).toThrow(/请输入有效的数字/)
  })

  it('负数报错', () => {
    expect(() => transform({ text: '-1' }, {})).toThrow(/应纳税所得额不能为负数/)
    expect(() => transform({ text: '-0.01' }, {})).toThrow(/应纳税所得额不能为负数/)
  })
})
