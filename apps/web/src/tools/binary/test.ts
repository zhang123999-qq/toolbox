import { describe, expect, it } from 'vitest'
import { formatRadix, parseRadix, transform } from './utils'

const bin = { source: '10', target: '2', separator: 'none' } as const
const bin4 = { source: '10', target: '2', separator: '4' } as const
const dec = { source: '2', target: '10', separator: 'none' } as const
const hex = { source: '10', target: '16', separator: 'none' } as const
const fromHex = { source: '16', target: '10', separator: 'none' } as const
const fromOct = { source: '8', target: '10', separator: 'none' } as const

describe('binary / 进制求值', () => {
  it('parseRadix 各进制求值与已知值一致', () => {
    expect(parseRadix('11111111', 2)).toBe(255n)
    expect(parseRadix('777', 8)).toBe(511n)
    expect(parseRadix('255', 10)).toBe(255n)
    expect(parseRadix('ff', 16)).toBe(255n)
  })

  it('formatRadix 支持按 4 / 8 位分组', () => {
    expect(formatRadix(255n, 2, 'none')).toBe('11111111')
    expect(formatRadix(255n, 2, '4')).toBe('1111 1111')
    // 300 的二进制是 9 位，按 8 位分组会出现「不满的前导组」
    expect(formatRadix(300n, 2, '8')).toBe('1 00101100')
  })
})

describe('binary / 转换', () => {
  it('十进制 255 → 二进制（按 4 位分组）', () => {
    expect(transform({ text: '255' }, bin4)).toBe('1111 1111')
  })

  it('二进制 → 十进制（行内空白被忽略）', () => {
    expect(transform({ text: '1111 1111' }, dec)).toBe('255')
  })

  it('十六进制大小写均可解析', () => {
    expect(transform({ text: 'FF' }, fromHex)).toBe('255')
    expect(transform({ text: 'ff' }, fromHex)).toBe('255')
  })

  it('八进制 → 十进制', () => {
    expect(transform({ text: '777' }, fromOct)).toBe('511')
  })

  it('十进制 → 十六进制输出小写字母', () => {
    expect(transform({ text: '255' }, hex)).toBe('ff')
  })

  it('任意长度整数不丢精度（超出 2^53 也精确）', () => {
    expect(transform({ text: '123456789012345678901234567890' }, hex)).toBe(
      '18ee90ff6c373e0ee4e3f0ad2',
    )
  })

  it('多行按行转换，空行被跳过', () => {
    expect(transform({ text: '255\n\n7' }, bin)).toBe('11111111\n111')
  })

  it('负号保留在数值前，且不参与分组', () => {
    expect(transform({ text: '-10' }, bin)).toBe('-1010')
    expect(transform({ text: '-255' }, bin4)).toBe('-1111 1111')
  })

  it('十进制与二进制往返一致', () => {
    const source = '9007199254740993'
    const binary = transform({ text: source }, bin)
    expect(transform({ text: binary }, dec)).toBe(source)
  })

  it('空串返回空串（边界）', () => {
    expect(transform({ text: '' }, bin)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('用错进制的字符报错（二进制里出现 2）', () => {
    expect(() => transform({ text: '102' }, dec)).toThrow(/不是合法的 2 进制数字/)
  })

  it('报告出错所在行号', () => {
    expect(() => transform({ text: '111\n12A' }, dec)).toThrow(/第 2 行/)
  })

  it('十进制里出现字母报错', () => {
    expect(() => transform({ text: '2A' }, bin)).toThrow(/不是合法的 10 进制数字/)
  })
})
