import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../i18n'
import { transform } from './utils'

const t = createTranslator('zh')
const BASE = { currency: 'CNY', locale: 'zh-CN', display: 'symbol', decimals: 'auto' }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('currency / transform 正常格式化', () => {
  it('默认：人民币符号 + 千分位 + 2 位小数', () => {
    expect(transform({ text: '1234567.89' }, BASE, t)).toBe('¥1,234,567.89')
  })

  it('美元符号（en-US）', () => {
    expect(
      transform({ text: '1234567.89' }, { ...BASE, currency: 'USD', locale: 'en-US' }, t),
    ).toBe('$1,234,567.89')
  })

  it('显示方式 code：USD 1,234,567.89', () => {
    const out = transform(
      { text: '1234567.89' },
      { ...BASE, currency: 'USD', locale: 'en-US', display: 'code' },
      t,
    )
    expect(out).toContain('USD')
    expect(out).toContain('1,234,567.89')
  })

  it('显示方式 name：1,234,567.89 US dollars', () => {
    const out = transform(
      { text: '1234567.89' },
      { ...BASE, currency: 'USD', locale: 'en-US', display: 'name' },
      t,
    )
    expect(out).toContain('1,234,567.89')
    expect(out).toContain('US dollars')
  })

  it('日元 auto 小数位按币种默认取 0 位（四舍五入）', () => {
    expect(transform({ text: '1234.5' }, { ...BASE, currency: 'JPY', locale: 'ja-JP' }, t)).toBe(
      '￥1,235',
    )
  })

  it('显式小数位 0：四舍五入到元', () => {
    expect(transform({ text: '1234567.89' }, { ...BASE, decimals: '0' }, t)).toBe('¥1,234,568')
  })

  it('显式小数位 4', () => {
    expect(transform({ text: '1234.5' }, { ...BASE, decimals: '4' }, t)).toBe('¥1,234.5000')
  })

  it('德式格式（de-DE）：1.234.567,89 €', () => {
    const out = transform({ text: '1234567.89' }, { ...BASE, currency: 'EUR', locale: 'de-DE' }, t)
    expect(out).toContain('1.234.567,89')
  })

  it('货币代码大小写不敏感', () => {
    expect(transform({ text: '10' }, { ...BASE, currency: 'cny' }, t)).toBe('¥10.00')
  })
})

describe('currency / transform 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '   ' }, BASE, t)).toBe('')
  })

  it('非法输入（非数字字符串）抛错', () => {
    expect(() => transform({ text: 'abc' }, BASE, t)).toThrow('金额无效：abc')
  })

  it('非法输入（Infinity）抛错', () => {
    expect(() => transform({ text: 'Infinity' }, BASE, t)).toThrow('金额无效')
  })

  it('非法输入（NaN 字符串）抛错', () => {
    expect(() => transform({ text: 'NaN' }, BASE, t)).toThrow('金额无效')
  })

  it('负数合法：-¥1,234.50', () => {
    expect(transform({ text: '-1234.5' }, BASE, t)).toBe('-¥1,234.50')
  })

  it('0 合法：¥0.00', () => {
    expect(transform({ text: '0' }, BASE, t)).toBe('¥0.00')
  })

  it('极大值 1e15 不丢精度展示', () => {
    expect(transform({ text: '1e15' }, BASE, t)).toBe('¥1,000,000,000,000,000.00')
  })

  it('精度边界：0.30000000000000004 按 2 位小数取整为 ¥0.30', () => {
    expect(transform({ text: '0.30000000000000004' }, BASE, t)).toBe('¥0.30')
  })

  it('未知货币代码抛错', () => {
    expect(() => transform({ text: '10' }, { ...BASE, currency: 'XX' }, t)).toThrow(
      '未知货币代码：XX',
    )
  })

  it('未知地区代码抛错', () => {
    expect(() => transform({ text: '10' }, { ...BASE, locale: 'xx-YY' }, t)).toThrow(
      '未知地区代码：xx-YY',
    )
  })

  it('未知显示方式抛错', () => {
    expect(() => transform({ text: '10' }, { ...BASE, display: 'emoji' }, t)).toThrow(
      '未知显示方式：emoji',
    )
  })

  it('非法小数位抛错', () => {
    expect(() => transform({ text: '10' }, { ...BASE, decimals: '9' }, t)).toThrow('小数位无效：9')
  })

  it('Intl 抛异常时转为格式化失败错误', () => {
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new RangeError('unsupported')
    })
    expect(() => transform({ text: '10' }, BASE, t)).toThrow('格式化失败')
  })
})
