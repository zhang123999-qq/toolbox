import { describe, expect, it } from 'vitest'
import { transform } from './utils'

const opt = (rate: string, people: string) => ({ rate, people })

describe('tip / 正常计算', () => {
  it('账单 200，15%，1 人', () => {
    expect(transform({ text: '200' }, opt('15', '1'))).toBe(
      '账单金额：200.00 元\n小费（15%）：30.00 元\n总计：230.00 元\n人均（1 人）：230.00 元',
    )
  })

  it('账单 200，20%，4 人', () => {
    expect(transform({ text: '200' }, opt('20', '4'))).toBe(
      '账单金额：200.00 元\n小费（20%）：40.00 元\n总计：240.00 元\n人均（4 人）：60.00 元',
    )
  })

  it('人数留空默认 1', () => {
    expect(transform({ text: '100' }, opt('10', ''))).toContain('人均（1 人）：110.00 元')
  })

  it('小数账单去浮点尾巴', () => {
    const out = transform({ text: '19.9' }, opt('15', '2'))
    expect(out).toContain('小费（15%）：2.98 元')
    expect(out).toContain('总计：22.88 元')
    expect(out).toContain('人均（2 人）：11.44 元')
  })
})

describe('tip / 账单校验', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opt('15', '1'))).toBe('')
    expect(transform({ text: '   ' }, opt('15', '1'))).toBe('')
  })

  it('账单非数字报错', () => {
    expect(() => transform({ text: 'abc' }, opt('15', '1'))).toThrow(/账单金额请输入有效的数字/)
  })

  it('账单 0 或负数报错', () => {
    expect(() => transform({ text: '0' }, opt('15', '1'))).toThrow(/账单金额必须大于 0/)
    expect(() => transform({ text: '-50' }, opt('15', '1'))).toThrow(/账单金额必须大于 0/)
  })
})

describe('tip / 小费比例校验', () => {
  it('非数字报错', () => {
    expect(() => transform({ text: '100' }, opt('abc', '1'))).toThrow(/小费比例应在 0 到 100 之间/)
  })

  it('0 或负数报错', () => {
    expect(() => transform({ text: '100' }, opt('0', '1'))).toThrow(/小费比例应在 0 到 100 之间/)
    expect(() => transform({ text: '100' }, opt('-5', '1'))).toThrow(/小费比例应在 0 到 100 之间/)
  })

  it('大于 100 报错', () => {
    expect(() => transform({ text: '100' }, opt('101', '1'))).toThrow(/小费比例应在 0 到 100 之间/)
  })

  it('100% 边界通过', () => {
    expect(transform({ text: '100' }, opt('100', '1'))).toContain('小费（100%）：100.00 元')
  })
})

describe('tip / 人数校验', () => {
  it('非数字报错', () => {
    expect(() => transform({ text: '100' }, opt('15', 'abc'))).toThrow(/人数应为大于等于 1 的整数/)
  })

  it('小数报错', () => {
    expect(() => transform({ text: '100' }, opt('15', '2.5'))).toThrow(/人数应为大于等于 1 的整数/)
  })

  it('0 或负数报错', () => {
    expect(() => transform({ text: '100' }, opt('15', '0'))).toThrow(/人数应为大于等于 1 的整数/)
    expect(() => transform({ text: '100' }, opt('15', '-3'))).toThrow(/人数应为大于等于 1 的整数/)
  })
})
