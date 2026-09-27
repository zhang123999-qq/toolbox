import { describe, expect, it } from 'vitest'
import { transform } from './utils'

const opt = (from: string, to: string) => ({ from, to })

describe('base-convert / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opt('10', '16'))).toBe('')
  })

  it('示例：255（10 进制）→ 16 进制', () => {
    expect(transform({ text: '255' }, opt('10', '16'))).toBe('255 (10进制) = FF (16进制)')
  })

  it('16 进制 → 10/2 进制', () => {
    expect(transform({ text: 'FF' }, opt('16', '10'))).toBe('FF (16进制) = 255 (10进制)')
    expect(transform({ text: 'FF' }, opt('16', '2'))).toBe('FF (16进制) = 11111111 (2进制)')
  })

  it('负数：首字符 -', () => {
    expect(transform({ text: '-FF' }, opt('16', '10'))).toBe('-FF (16进制) = -255 (10进制)')
  })

  it('0x/0b/0o 前缀在 from 一致时剥离', () => {
    expect(transform({ text: '0xFF' }, opt('16', '10'))).toBe('0xFF (16进制) = 255 (10进制)')
    expect(transform({ text: '0b101' }, opt('2', '10'))).toBe('0b101 (2进制) = 5 (10进制)')
    expect(transform({ text: '0o17' }, opt('8', '10'))).toBe('0o17 (8进制) = 15 (10进制)')
  })

  it('36 进制大小写不敏感、输出大写', () => {
    expect(transform({ text: 'zz' }, opt('36', '10'))).toBe('zz (36进制) = 1295 (10进制)')
    expect(transform({ text: '1295' }, opt('10', '36'))).toBe('1295 (10进制) = ZZ (36进制)')
  })

  it('任意精度：10^100 转 16 进制', () => {
    const out = transform({ text: '1' + '0'.repeat(100) }, opt('10', '16'))
    expect(out).toContain('1249AD2594C37CEB0B2784C4CE0BF38ACE408E211A7CAAB24308A82E8F1')
  })

  it('非法数字逐字符报错', () => {
    expect(() => transform({ text: '2' }, opt('2', '10'))).toThrow(/数字 "2" 在 2 进制下非法/)
    expect(() => transform({ text: '1G' }, opt('16', '10'))).toThrow(/数字 "G" 在 16 进制下非法/)
  })

  it('小数点直接报错', () => {
    expect(() => transform({ text: '3.5' }, opt('10', '16'))).toThrow(/仅支持整数/)
  })

  it('不支持的进制报错', () => {
    expect(() => transform({ text: '10' }, opt('7', '16'))).toThrow(/不支持的进制/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, opt('10', '16'))).toThrow(/200,000/)
  })
})
