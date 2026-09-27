import { describe, expect, it } from 'vitest'
import { comb, factorial, formatBig, parseNonNegativeInt, perm, transform } from './utils'

const empty = {}

describe('permutation / parseNonNegativeInt', () => {
  it('正常整数', () => {
    expect(parseNonNegativeInt('10', 'n')).toBe(10)
    expect(parseNonNegativeInt(' 0 ', 'n')).toBe(0)
  })

  it('空串报错', () => {
    expect(() => parseNonNegativeInt('', 'n')).toThrow(/n不能为空/)
  })

  it('小数 / 负数 / 非数字报错', () => {
    expect(() => parseNonNegativeInt('3.5', 'n')).toThrow(/必须是整数/)
    expect(() => parseNonNegativeInt('-2', 'n')).toThrow(/必须是整数/)
    expect(() => parseNonNegativeInt('abc', 'n')).toThrow(/必须是整数/)
  })

  it('超过上限报错', () => {
    expect(() => parseNonNegativeInt('1001', 'n')).toThrow(/超出上限 1000/)
  })
})

describe('permutation / 组合数学', () => {
  it('阶乘', () => {
    expect(factorial(0)).toBe(1n)
    expect(factorial(5)).toBe(120n)
    expect(factorial(20)).toBe(2432902008176640000n)
  })

  it('排列数 P(10,3) = 720', () => {
    expect(perm(10, 3)).toBe(720n)
  })

  it('组合数 C(10,3) = 120', () => {
    expect(comb(10, 3)).toBe(120n)
  })

  it('边界：P(n,0)=1，C(n,n)=1，C(n,0)=1', () => {
    expect(perm(7, 0)).toBe(1n)
    expect(comb(7, 7)).toBe(1n)
    expect(comb(7, 0)).toBe(1n)
  })

  it('大数精确：100! 无精度损失', () => {
    const f = factorial(100)
    expect(f.toString().length).toBe(158)
    expect(
      f
        .toString()
        .startsWith(
          '93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000',
        ),
    ).toBe(true)
  })
})

describe('permutation / formatBig', () => {
  it('千分位', () => {
    expect(formatBig(1234567n)).toBe('1,234,567')
    expect(formatBig(120n)).toBe('120')
  })
})

describe('permutation / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', k: '' }, empty)).toBe('')
  })

  it('P(10,3) / C(10,3)', () => {
    const out = transform({ text: '10', k: '3' }, empty)
    expect(out).toContain('排列数 P(10,3) = 720')
    expect(out).toContain('组合数 C(10,3) = 120')
    expect(out).toContain('10! = 3,628,800')
  })

  it('k 留空默认 = n', () => {
    const out = transform({ text: '5', k: '' }, empty)
    expect(out).toContain('n = 5，k = 5')
    expect(out).toContain('组合数 C(5,5) = 1')
  })

  it('k > n 报错', () => {
    expect(() => transform({ text: '3', k: '5' }, empty)).toThrow(/k 不能大于 n/)
  })

  it('非整数报错', () => {
    expect(() => transform({ text: '2.5', k: '' }, empty)).toThrow(/必须是整数/)
  })
})
