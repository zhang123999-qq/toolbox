import { describe, expect, it } from 'vitest'
import { calcIncomeTax, transform } from './utils'
import type { SalaryOptions } from './schema'

const DEFAULT_OPTS: SalaryOptions = { socialRate: '10.5', fundRate: '12' }

describe('salary / calcIncomeTax · 应纳税所得额 ≤ 0', () => {
  it('0 返回 0', () => {
    expect(calcIncomeTax(0)).toBe(0)
  })

  it('负数返回 0', () => {
    expect(calcIncomeTax(-50)).toBe(0)
  })
})

describe('salary / calcIncomeTax · 7 个档位', () => {
  it('第 1 档（3%，≤3000）：1000 → 30', () => {
    expect(calcIncomeTax(1000)).toBeCloseTo(30, 2)
  })

  it('边界 3000 仍属第 1 档 → 90', () => {
    expect(calcIncomeTax(3000)).toBeCloseTo(90, 2)
  })

  it('第 2 档（10%，速算扣除 210）：3000.01 → 90.001', () => {
    expect(calcIncomeTax(3000.01)).toBeCloseTo(90.001, 3)
  })

  it('第 2 档：8000 → 590', () => {
    expect(calcIncomeTax(8000)).toBeCloseTo(590, 2)
  })

  it('边界 12000 仍属第 2 档 → 990', () => {
    expect(calcIncomeTax(12000)).toBeCloseTo(990, 2)
  })

  it('第 3 档（20%，速算扣除 1410）：12000.01 → 990.002', () => {
    expect(calcIncomeTax(12000.01)).toBeCloseTo(990.002, 3)
  })

  it('第 3 档：20000 → 2590', () => {
    expect(calcIncomeTax(20000)).toBeCloseTo(2590, 2)
  })

  it('边界 25000 仍属第 3 档 → 3590', () => {
    expect(calcIncomeTax(25000)).toBeCloseTo(3590, 2)
  })

  it('第 4 档（25%，速算扣除 2660）：25000.01 → 3590.0025', () => {
    expect(calcIncomeTax(25000.01)).toBeCloseTo(3590.0025, 4)
  })

  it('边界 35000 仍属第 4 档 → 6090', () => {
    expect(calcIncomeTax(35000)).toBeCloseTo(6090, 2)
  })

  it('第 5 档（30%，速算扣除 4410）：35000.01 → 6090.003', () => {
    expect(calcIncomeTax(35000.01)).toBeCloseTo(6090.003, 3)
  })

  it('第 5 档：50000 → 10590', () => {
    expect(calcIncomeTax(50000)).toBeCloseTo(10590, 2)
  })

  it('边界 55000 仍属第 5 档 → 12090', () => {
    expect(calcIncomeTax(55000)).toBeCloseTo(12090, 2)
  })

  it('第 6 档（35%，速算扣除 7160）：55000.01 → 12090.0035', () => {
    expect(calcIncomeTax(55000.01)).toBeCloseTo(12090.0035, 4)
  })

  it('边界 80000 仍属第 6 档 → 20840', () => {
    expect(calcIncomeTax(80000)).toBeCloseTo(20840, 2)
  })

  it('第 7 档（45%，速算扣除 15160）：80000.01 → 20840.0045', () => {
    expect(calcIncomeTax(80000.01)).toBeCloseTo(20840.0045, 4)
  })

  it('第 7 档：100000 → 29840', () => {
    expect(calcIncomeTax(100000)).toBeCloseTo(29840, 2)
  })
})

describe('salary / transform · 完整输出', () => {
  it('15000 + 社保 10.5% + 公积金 12%（应纳税所得额 6625 → 10% 档）', () => {
    expect(transform({ text: '15000' }, DEFAULT_OPTS)).toBe(
      [
        '税前月薪：15000.00 元',
        '社保个人缴纳（10.5%）：1575.00 元',
        '公积金个人缴纳（12%）：1800.00 元',
        '应纳税所得额：6625.00 元',
        '个人所得税：452.50 元',
        '税后到手：11172.50 元',
      ].join('\n'),
    )
  })

  it('应纳税所得额 ≤ 0 时个税为 0、到手 = 税前 − 五险一金', () => {
    // 6000 − 630 − 720 − 5000 = −350 → 不纳税
    expect(transform({ text: '6000' }, DEFAULT_OPTS)).toBe(
      [
        '税前月薪：6000.00 元',
        '社保个人缴纳（10.5%）：630.00 元',
        '公积金个人缴纳（12%）：720.00 元',
        '应纳税所得额：0.00 元',
        '个人所得税：0.00 元',
        '税后到手：4650.00 元',
      ].join('\n'),
    )
  })

  it('切换比例影响输出（社保 8% + 公积金 5%）', () => {
    // 20000 − 1600 − 1000 − 5000 = 12400 → 20% 档：12400×0.2−1410 = 1070
    expect(transform({ text: '20000' }, { socialRate: '8', fundRate: '5' })).toBe(
      [
        '税前月薪：20000.00 元',
        '社保个人缴纳（8%）：1600.00 元',
        '公积金个人缴纳（5%）：1000.00 元',
        '应纳税所得额：12400.00 元',
        '个人所得税：1070.00 元',
        '税后到手：16330.00 元',
      ].join('\n'),
    )
  })

  it('比例为 0 合法（社保 0%）', () => {
    // 8000 − 0 − 960 − 5000 = 2040 → 3% 档：61.2
    const out = transform({ text: '8000' }, { socialRate: '0', fundRate: '12' })
    expect(out).toContain('社保个人缴纳（0%）：0.00 元')
    expect(out).toContain('个人所得税：61.20 元')
  })

  it('10000000（上限边界）通过', () => {
    expect(transform({ text: '10000000' }, DEFAULT_OPTS)).toContain('税前月薪：10000000.00 元')
  })

  it('带空格的输入自动 trim', () => {
    expect(transform({ text: '  15000  ' }, DEFAULT_OPTS)).toContain('税前月薪：15000.00 元')
  })
})

describe('salary / transform · 异常与边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, DEFAULT_OPTS)).toBe('')
    expect(transform({ text: '   ' }, DEFAULT_OPTS)).toBe('')
  })

  it('输入超过 200,000 字符报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, DEFAULT_OPTS)).toThrow(
      /输入超过 200,000 字符上限/,
    )
  })

  it('非数字报错', () => {
    expect(() => transform({ text: 'abc' }, DEFAULT_OPTS)).toThrow(/税前月薪请输入有效的数字/)
  })

  it('0 与负数报错', () => {
    expect(() => transform({ text: '0' }, DEFAULT_OPTS)).toThrow(/税前月薪必须大于 0/)
    expect(() => transform({ text: '-100' }, DEFAULT_OPTS)).toThrow(/税前月薪必须大于 0/)
  })

  it('超过 10000000 报错', () => {
    expect(() => transform({ text: '10000001' }, DEFAULT_OPTS)).toThrow(/金额超出合理范围/)
  })

  it('社保比例非数字报错', () => {
    expect(() => transform({ text: '15000' }, { socialRate: 'x', fundRate: '12' })).toThrow(
      /社保\/公积金比例非法/,
    )
  })

  it('社保比例为负报错', () => {
    expect(() => transform({ text: '15000' }, { socialRate: '-1', fundRate: '12' })).toThrow(
      /社保\/公积金比例非法/,
    )
  })

  it('社保比例超过 100 报错', () => {
    expect(() => transform({ text: '15000' }, { socialRate: '101', fundRate: '12' })).toThrow(
      /社保\/公积金比例非法/,
    )
  })

  it('公积金比例非法同样报错', () => {
    expect(() => transform({ text: '15000' }, { socialRate: '10.5', fundRate: 'NaN' })).toThrow(
      /社保\/公积金比例非法/,
    )
    expect(() => transform({ text: '15000' }, { socialRate: '10.5', fundRate: '-5' })).toThrow(
      /社保\/公积金比例非法/,
    )
    expect(() => transform({ text: '15000' }, { socialRate: '10.5', fundRate: '200' })).toThrow(
      /社保\/公积金比例非法/,
    )
  })
})
