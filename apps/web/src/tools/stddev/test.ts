import { describe, expect, it } from 'vitest'
import { calcStddev, formatResult, parseNumbers, transform } from './utils'
import type { StddevOptions } from './schema'

const empty: StddevOptions = { sample: false }

describe('stddev / parseNumbers', () => {
  it('多种分隔符混用', () => {
    expect(parseNumbers('1, 2 3\n4')).toEqual([1, 2, 3, 4])
  })

  it('非数字报错', () => {
    expect(() => parseNumbers('1, 哦')).toThrow(/无法识别的数字：哦/)
  })
})

describe('stddev / calcStddev', () => {
  // 经典数据集：均值 5，总体标准差 2，样本标准差 sqrt(32/7)
  const data = [2, 4, 4, 4, 5, 5, 7, 9]

  it('总体标准差（分母 n）', () => {
    const r = calcStddev(data, false)
    expect(r.mean).toBe(5)
    expect(r.stddev).toBe(2)
  })

  it('样本标准差（分母 n−1）', () => {
    const r = calcStddev(data, true)
    expect(r.stddev).toBeCloseTo(Math.sqrt(32 / 7), 10)
  })

  it('单个数据：总体标准差为 0', () => {
    expect(calcStddev([7], false).stddev).toBe(0)
  })

  it('单个数据：样本标准差报错', () => {
    expect(() => calcStddev([7], true)).toThrow(/至少需要 2 个数据/)
  })
})

describe('stddev / formatResult', () => {
  it('压平浮点噪声', () => {
    expect(formatResult(Math.sqrt(2))).toBe('1.414214')
  })
})

describe('stddev / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('默认总体标准差', () => {
    const out = transform({ text: '2, 4, 4, 4, 5, 5, 7, 9' }, empty)
    expect(out).toContain('总体标准差：2')
    expect(out).toContain('均值：5')
  })

  it('样本模式', () => {
    const out = transform({ text: '2, 4, 4, 4, 5, 5, 7, 9' }, { sample: true })
    expect(out).toContain('样本标准差：2.13809')
  })

  it('非法输入抛错', () => {
    expect(() => transform({ text: 'a' }, empty)).toThrow(/无法识别的数字/)
  })
})

describe('stddev / 边界补齐', () => {
  it('超长输入抛错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, empty)).toThrow(/超过 200,000 字符上限/)
  })

  it('全分隔符输入解析为空数组时返回空串', () => {
    expect(transform({ text: ',' }, empty)).toBe('')
  })

  it('sample 缺省时按总体标准差计算', () => {
    const out = transform({ text: '2, 4, 4, 4, 5, 5, 7, 9' }, {} as StddevOptions)
    expect(out).toContain('总体标准差：2')
    expect(out).toContain('（分母 n）')
  })
})
