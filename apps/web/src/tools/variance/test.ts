import { describe, expect, it } from 'vitest'
import { calcVariance, formatResult, parseNumbers, transform } from './utils'
import type { VarianceOptions } from './schema'

const empty: VarianceOptions = { sample: false }

describe('variance / parseNumbers', () => {
  it('多种分隔符混用', () => {
    expect(parseNumbers('1, 2 3\n4')).toEqual([1, 2, 3, 4])
  })

  it('非数字报错', () => {
    expect(() => parseNumbers('1, 哦')).toThrow(/无法识别的数字：哦/)
  })
})

describe('variance / calcVariance', () => {
  // 经典数据集：均值 5，总体方差 4，样本方差 32/7
  const data = [2, 4, 4, 4, 5, 5, 7, 9]

  it('总体方差（分母 n）', () => {
    const r = calcVariance(data, false)
    expect(r.mean).toBe(5)
    expect(r.variance).toBe(4)
  })

  it('样本方差（分母 n−1）', () => {
    const r = calcVariance(data, true)
    expect(r.variance).toBeCloseTo(32 / 7, 10)
  })

  it('单个数据：总体方差为 0', () => {
    expect(calcVariance([7], false).variance).toBe(0)
  })

  it('单个数据：样本方差报错', () => {
    expect(() => calcVariance([7], true)).toThrow(/至少需要 2 个数据/)
  })

  it('全相同数据方差为 0', () => {
    expect(calcVariance([3, 3, 3], false).variance).toBe(0)
    expect(calcVariance([3, 3, 3], true).variance).toBe(0)
  })
})

describe('variance / formatResult', () => {
  it('压平浮点噪声', () => {
    expect(formatResult(0.1 + 0.2)).toBe('0.3')
  })

  it('整数不带小数点', () => {
    expect(formatResult(4)).toBe('4')
  })
})

describe('variance / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('默认总体方差', () => {
    const out = transform({ text: '2, 4, 4, 4, 5, 5, 7, 9' }, empty)
    expect(out).toContain('总体方差：4')
    expect(out).toContain('均值：5')
  })

  it('样本模式', () => {
    const out = transform({ text: '2, 4, 4, 4, 5, 5, 7, 9' }, { sample: true })
    expect(out).toContain('样本方差：4.571429')
  })

  it('非法输入抛错', () => {
    expect(() => transform({ text: 'a' }, empty)).toThrow(/无法识别的数字/)
  })
})
