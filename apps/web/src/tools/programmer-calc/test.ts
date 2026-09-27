import { describe, expect, it } from 'vitest'
import { evaluate, transform } from './utils'

const empty = {}

describe('programmer-calc / 字面量', () => {
  it('0b/0o/0x 前缀与十进制', () => {
    expect(evaluate('0b1010')).toBe(10n)
    expect(evaluate('0o17')).toBe(15n)
    expect(evaluate('0xFF')).toBe(255n)
    expect(evaluate('42')).toBe(42n)
  })

  it('任意精度 BigInt', () => {
    expect(evaluate('0xFFFFFFFFFFFFFFFF + 1')).toBe(18446744073709551616n)
  })

  it('非法字面量报错', () => {
    expect(() => evaluate('0b2')).toThrow(/数字 "0b2" 非法/)
    expect(() => evaluate('0x')).toThrow(/缺少有效数字/)
  })
})

describe('programmer-calc / 优先级（C 语言）', () => {
  it('* / % > + -', () => {
    expect(evaluate('2+3*4')).toBe(14n)
    expect(evaluate('10-8/4')).toBe(8n)
  })

  it('+ - > << >>', () => {
    expect(evaluate('2<<3+1')).toBe(32n) // 2 << 4
    expect(evaluate('(2+3)*4')).toBe(20n)
  })

  it('<< >> > & > ^ > |', () => {
    expect(evaluate('0b1100 & 0b1010 ^ 0b1111')).toBe(7n) // (12&10)^15
    expect(evaluate('1 | 2 ^ 3')).toBe(1n) // 1 | (2^3) = 1 | 1 = 1
  })

  it('单目 - 与 ~ 优先级最高', () => {
    expect(evaluate('-5+3')).toBe(-2n)
    expect(evaluate('-(3+4)*2')).toBe(-14n)
    expect(evaluate('~0')).toBe(-1n)
    expect(evaluate('~0xFF')).toBe(-256n)
  })
})

describe('programmer-calc / 运算语义', () => {
  it('除法向零取整', () => {
    expect(evaluate('7/2')).toBe(3n)
    expect(evaluate('-7/2')).toBe(-3n)
    expect(evaluate('10 % 3')).toBe(1n)
  })

  it('移位', () => {
    expect(evaluate('1<<10')).toBe(1024n)
    expect(evaluate('1024>>3')).toBe(128n)
  })

  it('除零报错', () => {
    expect(() => evaluate('1/0')).toThrow(/除数不能为 0/)
    expect(() => evaluate('1%0')).toThrow(/除数不能为 0/)
  })

  it('非法移位报错', () => {
    expect(() => evaluate('1<<-1')).toThrow(/移位位数超出范围/)
  })

  it('括号不匹配报错', () => {
    expect(() => evaluate('(1+2')).toThrow(/括号不匹配/)
    expect(() => evaluate('1+2)')).toThrow(/括号不匹配/)
  })

  it('小数直接报错', () => {
    expect(() => evaluate('3.5+1')).toThrow(/仅支持整数运算/)
  })

  it('残缺表达式报错', () => {
    expect(() => evaluate('2+')).toThrow(/表达式无效/)
    expect(() => evaluate('abc')).toThrow(/无法识别/)
  })
})

describe('programmer-calc / transform 四行对照', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('示例输出四对照', () => {
    const out = transform({ text: '0xFF & 0b1010 | 12' }, empty)
    expect(out).toBe(['十进制：14', '十六进制：0xE', '八进制：0o16', '二进制：0b1110'].join('\n'))
  })

  it('负数：十进制照常，hex/oct/bin 取绝对值', () => {
    const out = transform({ text: '-255' }, empty)
    expect(out).toContain('十进制：-255')
    expect(out).toContain('十六进制：0xFF')
    expect(out).toContain('八进制：0o377')
    expect(out).toContain('二进制：0b11111111')
  })

  it('十六进制输出大写', () => {
    expect(transform({ text: '0xabcdef' }, empty)).toContain('十六进制：0xABCDEF')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, empty)).toThrow(/200,000/)
  })
})
