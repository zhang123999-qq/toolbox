import { describe, expect, it } from 'vitest'
import { parsePositive, transform } from './utils'

const rateMode = { mode: '按折扣率' }
const finalMode = { mode: '按折后价' }

describe('discount / 按折扣率', () => {
  it('100 元 8.5 折', () => {
    expect(transform({ text: '100', textB: '8.5' }, rateMode)).toBe(
      '原价：100.00 元\n折扣：8.5 折\n折后价：85.00 元\n节省：15.00 元',
    )
  })

  it('折扣 10（不打折）', () => {
    expect(transform({ text: '100', textB: '10' }, rateMode)).toBe(
      '原价：100.00 元\n折扣：10 折\n折后价：100.00 元\n节省：0.00 元',
    )
  })

  it('小数折扣 8.55 去浮点尾巴', () => {
    const out = transform({ text: '99', textB: '8.55' }, rateMode)
    expect(out).toContain('折扣：8.55 折')
    expect(out).toContain('折后价：84.65 元')
  })

  it('折扣为空报错', () => {
    expect(() => transform({ text: '100', textB: '' }, rateMode)).toThrow(/折扣不能为空/)
    expect(() => transform({ text: '100', textB: '   ' }, rateMode)).toThrow(/折扣不能为空/)
  })

  it('折扣非数字报错', () => {
    expect(() => transform({ text: '100', textB: 'abc' }, rateMode)).toThrow(/折扣请输入有效的数字/)
  })

  it('折扣越界报错（0 / 负数 / 大于 10）', () => {
    expect(() => transform({ text: '100', textB: '0' }, rateMode)).toThrow(/折扣应在 0 到 10 之间/)
    expect(() => transform({ text: '100', textB: '-2' }, rateMode)).toThrow(/折扣应在 0 到 10 之间/)
    expect(() => transform({ text: '100', textB: '10.01' }, rateMode)).toThrow(
      /折扣应在 0 到 10 之间/,
    )
  })
})

describe('discount / 按折后价', () => {
  it('原价 100 折后 85 反推 8.5 折', () => {
    expect(transform({ text: '100', textB: '85' }, finalMode)).toBe(
      '原价：100.00 元\n折扣：8.5 折\n折后价：85.00 元\n节省：15.00 元',
    )
  })

  it('折后价等于原价（不打折）', () => {
    expect(transform({ text: '100', textB: '100' }, finalMode)).toBe(
      '原价：100.00 元\n折扣：10 折\n折后价：100.00 元\n节省：0.00 元',
    )
  })

  it('折后价为空报错', () => {
    expect(() => transform({ text: '100', textB: '' }, finalMode)).toThrow(/折后价不能为空/)
  })

  it('折后价非数字报错', () => {
    expect(() => transform({ text: '100', textB: 'xyz' }, finalMode)).toThrow(
      /折后价请输入有效的数字/,
    )
  })

  it('折后价 0 或负数报错', () => {
    expect(() => transform({ text: '100', textB: '0' }, finalMode)).toThrow(/折后价必须大于 0/)
    expect(() => transform({ text: '100', textB: '-5' }, finalMode)).toThrow(/折后价必须大于 0/)
  })

  it('折后价高于原价报错', () => {
    expect(() => transform({ text: '100', textB: '101' }, finalMode)).toThrow(/折后价不能高于原价/)
  })
})

describe('discount / 原价校验与未知模式', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '8.5' }, rateMode)).toBe('')
    expect(transform({ text: '   ', textB: '8.5' }, rateMode)).toBe('')
  })

  it('原价非数字报错', () => {
    expect(() => transform({ text: 'abc', textB: '8.5' }, rateMode)).toThrow(/原价请输入有效的数字/)
  })

  it('原价 0 或负数报错', () => {
    expect(() => transform({ text: '0', textB: '8.5' }, rateMode)).toThrow(/原价必须大于 0/)
    expect(() => transform({ text: '-10', textB: '8.5' }, rateMode)).toThrow(/原价必须大于 0/)
  })

  it('未知计算方式报错', () => {
    expect(() => transform({ text: '100', textB: '8.5' }, { mode: '未知' })).toThrow(/未知计算方式/)
  })
})

describe('discount / parsePositive', () => {
  it('正常值返回数字（带前后空格）', () => {
    expect(parsePositive(' 100 ', '原价')).toBe(100)
    expect(parsePositive('8.5', '原价')).toBe(8.5)
  })

  it('NaN 抛错', () => {
    expect(() => parsePositive('abc', '原价')).toThrow(/原价请输入有效的数字/)
  })

  it('0 抛错', () => {
    expect(() => parsePositive('0', '原价')).toThrow(/原价必须大于 0/)
  })

  it('负数抛错', () => {
    expect(() => parsePositive('-1', '原价')).toThrow(/原价必须大于 0/)
  })
})
