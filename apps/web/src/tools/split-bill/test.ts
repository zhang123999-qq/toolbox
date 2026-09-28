import { describe, expect, it } from 'vitest'
import { transform } from './utils'

const opt = (tipRate: string) => ({ tipRate })
const input = (text: string, textB: string) => ({ text, textB })

describe('split-bill / 正常计算', () => {
  it('300 元 3 人，无小费', () => {
    expect(transform(input('300', '3'), opt('0'))).toBe(
      '消费总额：300.00 元\n小费（0%）：0.00 元\n应付总计：300.00 元\n人均（3 人）：100.00 元',
    )
  })

  it('300 元 3 人，10% 小费', () => {
    expect(transform(input('300', '3'), opt('10'))).toBe(
      '消费总额：300.00 元\n小费（10%）：30.00 元\n应付总计：330.00 元\n人均（3 人）：110.00 元',
    )
  })

  it('除不尽的人均去浮点尾巴', () => {
    const out = transform(input('100', '3'), opt('15'))
    expect(out).toContain('小费（15%）：15.00 元')
    expect(out).toContain('应付总计：115.00 元')
    expect(out).toContain('人均（3 人）：38.33 元')
  })
})

describe('split-bill / 总金额校验', () => {
  it('空输入返回空串', () => {
    expect(transform(input('', '3'), opt('0'))).toBe('')
    expect(transform(input('   ', '3'), opt('0'))).toBe('')
  })

  it('总金额非数字报错', () => {
    expect(() => transform(input('abc', '3'), opt('0'))).toThrow(/总金额请输入有效的数字/)
  })

  it('总金额 0 或负数报错', () => {
    expect(() => transform(input('0', '3'), opt('0'))).toThrow(/总金额必须大于 0/)
    expect(() => transform(input('-100', '3'), opt('0'))).toThrow(/总金额必须大于 0/)
  })
})

describe('split-bill / 人数校验', () => {
  it('人数为空报错', () => {
    expect(() => transform(input('300', ''), opt('0'))).toThrow(/人数不能为空/)
    expect(() => transform(input('300', '   '), opt('0'))).toThrow(/人数不能为空/)
  })

  it('人数非数字报错', () => {
    expect(() => transform(input('300', 'abc'), opt('0'))).toThrow(/人数应为大于等于 1 的整数/)
  })

  it('人数为小数报错', () => {
    expect(() => transform(input('300', '2.5'), opt('0'))).toThrow(/人数应为大于等于 1 的整数/)
  })

  it('人数 0 或负数报错', () => {
    expect(() => transform(input('300', '0'), opt('0'))).toThrow(/人数应为大于等于 1 的整数/)
    expect(() => transform(input('300', '-2'), opt('0'))).toThrow(/人数应为大于等于 1 的整数/)
  })
})

describe('split-bill / 小费比例校验', () => {
  it('非法小费比例报错', () => {
    expect(() => transform(input('300', '3'), opt('abc'))).toThrow(/小费比例非法/)
  })
})
