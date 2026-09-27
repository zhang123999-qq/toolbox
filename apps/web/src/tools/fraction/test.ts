import { describe, expect, it } from 'vitest'
import { Fraction } from 'fraction.js'
import { evaluate, toDecimalString, tokenize, transform } from './utils'

const D10 = { decimals: '10' } as const

describe('fraction / tokenize', () => {
  it('分数与带分数各为一个 token', () => {
    expect(tokenize('1/2')).toEqual([{ kind: 'num', value: '1/2' }])
    expect(tokenize('1 1/2')).toEqual([{ kind: 'num', value: '1 1/2' }])
  })

  it('运算符与括号', () => {
    const kinds = tokenize('(1/2 + 3) * 2').map((t) => t.kind)
    expect(kinds).toEqual(['lparen', 'num', 'op', 'num', 'rparen', 'op', 'num'])
  })

  it('非法字符报错', () => {
    expect(() => tokenize('1/2 & 3')).toThrow(/无法识别的字符/)
  })
})

describe('fraction / evaluate 精确运算', () => {
  it('1/2 + 1/3 = 5/6（无浮点误差）', () => {
    expect(evaluate('1/2 + 1/3').toFraction()).toBe('5/6')
  })

  it('带分数与小数混合：1 1/2 + 0.5 = 2', () => {
    expect(evaluate('1 1/2 + 0.5').toFraction()).toBe('2')
  })

  it('运算符优先级：1/2 + 1/3 * 3 = 3/2', () => {
    expect(evaluate('1/2 + 1/3 * 3').toFraction()).toBe('3/2')
  })

  it('括号：(1/2 + 1/3) * 6 = 5', () => {
    expect(evaluate('(1/2 + 1/3) * 6').toFraction()).toBe('5')
  })

  it('一元负号：-1/2 + 1 = 1/2', () => {
    expect(evaluate('-1/2 + 1').toFraction()).toBe('1/2')
  })

  it('乘方：(2/3)^2 = 4/9', () => {
    expect(evaluate('(2/3)^2').toFraction()).toBe('4/9')
  })

  it('除数为 0 中文报错', () => {
    expect(() => evaluate('1/2 / 0')).toThrow(/除数不能为 0/)
  })

  it('非整数指数报错', () => {
    expect(() => evaluate('2^0.5')).toThrow(/指数必须为整数/)
  })

  it('多余内容报错', () => {
    expect(() => evaluate('1/2 3/4')).toThrow(/表达式无效/)
  })
})

describe('fraction / toDecimalString 精确小数展开', () => {
  it('1/2 → 0.5（去尾零）', () => {
    expect(toDecimalString(new Fraction(1, 2), 10)).toBe('0.5')
  })

  it('1/3 十位四舍五入', () => {
    expect(toDecimalString(new Fraction(1, 3), 10)).toBe('0.3333333333')
  })

  it('2/3 十位：0.6666666667（末位进位）', () => {
    expect(toDecimalString(new Fraction(2, 3), 10)).toBe('0.6666666667')
  })

  it('负数：-7/6 → -1.1666666667', () => {
    expect(toDecimalString(new Fraction(-7, 6), 10)).toBe('-1.1666666667')
  })
})

describe('fraction / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, D10)).toBe('')
  })

  it('输出分数/带分数/小数四行', () => {
    const out = transform({ text: '1/2 + 1/3' }, { decimals: '10' })
    expect(out).toContain('表达式：1/2 + 1/3')
    expect(out).toContain('分数：5/6')
    expect(out).toContain('带分数：5/6')
    expect(out).toContain('小数（10 位）：0.8333333333')
  })

  it('带分数输出：7/6 → 1 1/6', () => {
    const out = transform({ text: '1/2 + 2/3' }, { decimals: '4' })
    expect(out).toContain('带分数：1 1/6')
    expect(out).toContain('小数（4 位）：1.1667')
  })

  it('非法表达式报错', () => {
    expect(() => transform({ text: '1/2 +' }, { decimals: '10' })).toThrow()
  })
})
