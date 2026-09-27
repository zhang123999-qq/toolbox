import { describe, expect, it } from 'vitest'
import { fmt, parseNumber, percentChange, percentOf, percentValue, transform } from './utils'

const OF = { mode: 'of' } as const

describe('percentage / parseNumber', () => {
  it('解析普通数字与千分位', () => {
    expect(parseNumber('200', 'A')).toBe(200)
    expect(parseNumber('1,000', 'A')).toBe(1000)
    expect(parseNumber(' 3.5 ', 'A')).toBe(3.5)
  })

  it('末尾百分号自动去掉', () => {
    expect(parseNumber('50%', 'A')).toBe(50)
  })

  it('空值与非法输入抛中文错误', () => {
    expect(() => parseNumber('', 'A')).toThrow(/不能为空/)
    expect(() => parseNumber('abc', 'A')).toThrow(/不是有效数字/)
  })
})

describe('percentage / percentOf 占比', () => {
  it('50 是 200 的 25%', () => {
    expect(percentOf(50, 200)).toMatchObject({ percent: 25, ratio: 0.25 })
  })

  it('B 为 0 报错', () => {
    expect(() => percentOf(50, 0)).toThrow(/不能为 0/)
  })
})

describe('percentage / percentValue 求值', () => {
  it('200 的 50% 是 100', () => {
    expect(percentValue(200, 50)).toBe(100)
  })
})

describe('percentage / percentChange 变化率', () => {
  it('100 到 150 增长 50%', () => {
    expect(percentChange(100, 150)).toMatchObject({ percent: 50, delta: 50 })
  })

  it('100 到 80 下降 20%', () => {
    const r = percentChange(100, 80)
    expect(r.percent).toBe(-20)
    expect(r.delta).toBe(-20)
  })

  it('原值为 0 报错', () => {
    expect(() => percentChange(0, 150)).toThrow(/不能为 0/)
  })
})

describe('percentage / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, OF)).toBe('')
  })

  it('默认模式输出占比三行', () => {
    const out = transform({ text: '50', textB: '200' }, { mode: 'of' })
    expect(out).toContain('50 是 200 的 25%')
    expect(out).toContain('算式：')
    expect(out).toContain('小数形式：0.25')
  })

  it('value 模式', () => {
    const out = transform({ text: '200', textB: '50' }, { mode: 'value' })
    expect(out).toContain('200 的 50% 是 100')
  })

  it('change 模式增长与下降', () => {
    expect(transform({ text: '100', textB: '150' }, { mode: 'change' })).toContain('增长 50%')
    expect(transform({ text: '100', textB: '80' }, { mode: 'change' })).toContain('下降 20%')
    expect(transform({ text: '100', textB: '80' }, { mode: 'change' })).toContain('变化量：-20')
  })

  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc', textB: '200' }, { mode: 'of' })).toThrow(/不是有效数字/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001), textB: '' }, { mode: 'of' })).toThrow(
      /200,000/,
    )
  })
})

describe('percentage / fmt 去浮点噪声', () => {
  it('整数原样输出', () => {
    expect(fmt(25)).toBe('25')
  })

  it('33.333333333333336 被压平', () => {
    expect(fmt(100 / 3)).toBe('33.3333333333')
  })
})
