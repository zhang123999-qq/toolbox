import { describe, expect, it } from 'vitest'
import { gcd, lcm, parseIntStrict, transform } from './utils'

const empty = {}

describe('gcd-lcm / gcd 欧几里得算法', () => {
  it('12 与 18 的最大公约数为 6', () => {
    expect(gcd(12n, 18n)).toBe(6n)
  })

  it('负数取绝对值', () => {
    expect(gcd(-12n, 18n)).toBe(6n)
    expect(gcd(-12n, -18n)).toBe(6n)
  })

  it('含 0：gcd(0, 5) = 5', () => {
    expect(gcd(0n, 5n)).toBe(5n)
    expect(gcd(0n, 0n)).toBe(0n)
  })

  it('大整数精确（超出 Number 安全范围）', () => {
    const a = 9007199254740993n // 2^53 + 1
    const b = 9007199254740993n * 7n
    expect(gcd(a, b)).toBe(a)
  })

  it('互质对', () => {
    expect(gcd(17n, 29n)).toBe(1n)
  })
})

describe('gcd-lcm / lcm', () => {
  it('lcm(12, 18) = 36', () => {
    expect(lcm(12n, 18n)).toBe(36n)
  })

  it('含 0 时为 0', () => {
    expect(lcm(0n, 5n)).toBe(0n)
  })

  it('满足 a·b = gcd·lcm', () => {
    const a = 12345678901234567890n
    const b = 98765432109876543210n
    expect(gcd(a, b) * lcm(a, b)).toBe(a * b)
  })
})

describe('gcd-lcm / parseIntStrict', () => {
  it('拒绝小数与指数记法', () => {
    expect(() => parseIntStrict('12.5')).toThrow(/整数/)
    expect(() => parseIntStrict('1e3')).toThrow(/整数/)
    expect(() => parseIntStrict('abc')).toThrow(/整数/)
  })

  it('允许正负号与前导零', () => {
    expect(parseIntStrict('+007')).toBe(7n)
    expect(parseIntStrict('-42')).toBe(-42n)
  })
})

describe('gcd-lcm / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, empty)).toBe('')
  })

  it('示例输出 GCD/LCM/互质', () => {
    const out = transform({ text: '12', textB: '18' }, empty)
    expect(out).toContain('最大公约数（GCD）：6')
    expect(out).toContain('最小公倍数（LCM）：36')
    expect(out).toContain('互质：否')
  })

  it('textB 留空时默认与 A 相同（17,17 不互质）', () => {
    const out = transform({ text: '17', textB: '' }, empty)
    expect(out).toContain('整数 B：17')
    expect(out).toContain('最大公约数（GCD）：17')
    expect(out).toContain('最小公倍数（LCM）：17')
    expect(out).toContain('互质：否')
  })

  it('互质对标注互质：是', () => {
    const out = transform({ text: '17', textB: '29' }, empty)
    expect(out).toContain('最大公约数（GCD）：1')
    expect(out).toContain('互质：是（GCD = 1）')
  })

  it('非整数报错', () => {
    expect(() => transform({ text: '12.5', textB: '' }, empty)).toThrow(/整数/)
  })
})
