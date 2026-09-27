import { describe, expect, it } from 'vitest'
import { isPrime, parseInteger, smallestPrimeFactor, transform } from './utils'

const empty = {}

describe('prime / parseInteger', () => {
  it('正常整数', () => {
    expect(parseInteger('17')).toBe(17n)
    expect(parseInteger(' -42 ')).toBe(-42n)
  })

  it('空串报错', () => {
    expect(() => parseInteger('')).toThrow(/输入不能为空/)
  })

  it('小数 / 非数字报错', () => {
    expect(() => parseInteger('3.14')).toThrow(/请输入整数/)
    expect(() => parseInteger('abc')).toThrow(/请输入整数/)
  })

  it('超出 10^12 报错', () => {
    expect(() => parseInteger('1000000000001')).toThrow(/超出支持范围/)
    expect(() => parseInteger('-1000000000001')).toThrow(/超出支持范围/)
  })

  it('边界 10^12 通过', () => {
    expect(parseInteger('1000000000000')).toBe(1000000000000n)
  })
})

describe('prime / isPrime', () => {
  it('小质数', () => {
    for (const p of [2, 3, 5, 7, 11, 13, 97, 101]) {
      expect(isPrime(BigInt(p))).toBe(true)
    }
  })

  it('小合数', () => {
    for (const c of [4, 6, 8, 9, 15, 100, 1001]) {
      expect(isPrime(BigInt(c))).toBe(false)
    }
  })

  it('0 / 1 / 负数不是质数', () => {
    expect(isPrime(0n)).toBe(false)
    expect(isPrime(1n)).toBe(false)
    expect(isPrime(-7n)).toBe(false)
  })

  it('大质数 9999999967（< 10^12）', () => {
    expect(isPrime(9999999967n)).toBe(true)
  })

  it('大合数 9999999969 = 3 × 3333333323', () => {
    expect(isPrime(9999999969n)).toBe(false)
  })

  it('Carmichael 数 561 不是质数', () => {
    expect(isPrime(561n)).toBe(false)
  })

  it('强伪素数 2047（以 2 为底）不是质数', () => {
    expect(isPrime(2047n)).toBe(false)
  })
})

describe('prime / smallestPrimeFactor', () => {
  it('偶数返回 2', () => {
    expect(smallestPrimeFactor(100n)).toBe(2n)
  })

  it('奇合数', () => {
    expect(smallestPrimeFactor(9999999969n)).toBe(3n)
    expect(smallestPrimeFactor(1001n)).toBe(7n)
  })
})

describe('prime / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('质数输出', () => {
    const out = transform({ text: '9999999967' }, empty)
    expect(out).toContain('是质数 ✓')
  })

  it('合数给出最小质因数', () => {
    const out = transform({ text: '100' }, empty)
    expect(out).toContain('不是质数（合数）')
    expect(out).toContain('最小质因数：2')
  })

  it('1 不是质数', () => {
    expect(transform({ text: '1' }, empty)).toContain('不是质数')
  })

  it('超限报错', () => {
    expect(() => transform({ text: '9999999999999' }, empty)).toThrow(/超出支持范围/)
  })

  it('输出包含范围说明', () => {
    expect(transform({ text: '7' }, empty)).toContain('|n| ≤ 10¹²')
  })
})
