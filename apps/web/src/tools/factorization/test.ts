import { describe, expect, it } from 'vitest'
import {
  divisorCount,
  divisorSum,
  factorize,
  formatFactors,
  parseInteger,
  superscript,
  transform,
} from './utils'

const empty = {}

describe('factorization / parseInteger', () => {
  it('正常整数', () => {
    expect(parseInteger('360')).toBe(360n)
    expect(parseInteger('-12')).toBe(-12n)
  })

  it('空串报错', () => {
    expect(() => parseInteger('')).toThrow(/输入不能为空/)
  })

  it('小数报错', () => {
    expect(() => parseInteger('3.5')).toThrow(/请输入整数/)
  })

  it('超出 10^12 报错', () => {
    expect(() => parseInteger('1000000000001')).toThrow(/超出支持范围/)
  })
})

describe('factorization / factorize', () => {
  it('360 = 2³ × 3² × 5', () => {
    expect(factorize(360n)).toEqual([
      { prime: 2n, exponent: 3 },
      { prime: 3n, exponent: 2 },
      { prime: 5n, exponent: 1 },
    ])
  })

  it('质数返回自身', () => {
    expect(factorize(9999999967n)).toEqual([{ prime: 9999999967n, exponent: 1 }])
  })

  it('2 的幂', () => {
    expect(factorize(1024n)).toEqual([{ prime: 2n, exponent: 10 }])
  })

  it('大合数 9999999969 = 3 × 3333333323', () => {
    expect(factorize(9999999969n)).toEqual([
      { prime: 3n, exponent: 1 },
      { prime: 3333333323n, exponent: 1 },
    ])
  })
})

describe('factorization / divisorCount & divisorSum', () => {
  it('360：因数 24 个，和 1170', () => {
    const f = factorize(360n)
    expect(divisorCount(f)).toBe(24n)
    expect(divisorSum(f)).toBe(1170n)
  })

  it('质数 p：因数 2 个，和 p+1', () => {
    const f = factorize(13n)
    expect(divisorCount(f)).toBe(2n)
    expect(divisorSum(f)).toBe(14n)
  })
})

describe('factorization / 展示函数', () => {
  it('superscript 多位指数', () => {
    expect(superscript(10)).toBe('¹⁰')
    expect(superscript(3)).toBe('³')
  })

  it('formatFactors', () => {
    expect(formatFactors(factorize(360n))).toBe('2³ × 3² × 5')
  })
})

describe('factorization / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('360 分解输出', () => {
    const out = transform({ text: '360' }, empty)
    expect(out).toContain('360 = 2³ × 3² × 5')
    expect(out).toContain('因数个数：24')
    expect(out).toContain('因数和：1,170')
  })

  it('负数分解带 −1 前缀', () => {
    const out = transform({ text: '-12' }, empty)
    expect(out).toContain('-12 = −1 × 2² × 3')
  })

  it('1 没有质因数', () => {
    expect(transform({ text: '1' }, empty)).toContain('±1 没有质因数')
  })

  it('0 报错', () => {
    expect(() => transform({ text: '0' }, empty)).toThrow(/0 不能进行因数分解/)
  })

  it('超限报错', () => {
    expect(() => transform({ text: '1000000000001' }, empty)).toThrow(/超出支持范围/)
  })
})
