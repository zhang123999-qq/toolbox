import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { decimalArith, evaluate, floatArith, transform } from './utils'

const empty = {}

describe('decimal / evaluate 精确 vs 浮点', () => {
  it('0.1+0.2 精确结果为 0.3', () => {
    expect(evaluate('0.1 + 0.2', decimalArith).toString()).toBe('0.3')
  })

  it('同一表达式 JS 浮点为 0.30000000000000004', () => {
    expect(evaluate('0.1 + 0.2', floatArith)).toBe(0.30000000000000004)
  })

  it('四则与括号：(1.5 + 2.5) * 2 = 8', () => {
    expect(evaluate('(1.5 + 2.5) * 2', decimalArith).toString()).toBe('8')
  })

  it('科学计数法输入：1.5e-3 * 1000 = 1.5', () => {
    expect(evaluate('1.5e-3 * 1000', decimalArith).toString()).toBe('1.5')
  })

  it('乘方：1.1^2 = 1.21（精确）', () => {
    expect(evaluate('1.1^2', decimalArith).toString()).toBe('1.21')
    expect(evaluate('1.1^2', floatArith)).toBe(1.2100000000000002)
  })

  it('一元负号：-0.1 + 0.3 = 0.2', () => {
    expect(evaluate('-0.1 + 0.3', decimalArith).toString()).toBe('0.2')
  })

  it('除数为 0 中文报错', () => {
    expect(() => evaluate('1.5 / 0', decimalArith)).toThrow(/除数不能为 0/)
  })

  it('非法数字报错', () => {
    expect(() => evaluate('1.5 + abc', decimalArith)).toThrow(/无法识别的字符/)
  })
})

describe('decimal / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
  })

  it('输出精确/浮点/科学计数法/分数五行', () => {
    const out = transform({ text: '0.1 + 0.2' }, empty)
    expect(out).toContain('表达式：0.1 + 0.2')
    expect(out).toContain('精确结果：0.3')
    expect(out).toContain('JS 浮点结果：0.30000000000000004')
    expect(out).toContain('科学计数法：3e-1')
    expect(out).toContain('分数：3/10')
  })

  it('纯数字输入同样转换', () => {
    const out = transform({ text: '2.5' }, empty)
    expect(out).toContain('精确结果：2.5')
    expect(out).toContain('分数：5/2')
  })

  it('非法表达式报错', () => {
    expect(() => transform({ text: '1.5 +' }, empty)).toThrow()
  })

  it('decimal.js 默认 20 位有效数字：1/3', () => {
    const d = evaluate('1/3', decimalArith)
    expect(d).toBeInstanceOf(Decimal)
    expect(d.toString()).toBe('0.33333333333333333333')
  })
})
