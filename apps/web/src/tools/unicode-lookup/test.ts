import { describe, expect, it } from 'vitest'
import { blockOf, describeChar, transform } from './utils'

describe('unicode-lookup / describe', () => {
  it('ASCII 字符的码位与转义', () => {
    const info = describeChar('A')
    expect(info.hex).toBe('U+0041')
    expect(info.jsEscape).toBe('\\u0041')
    expect(info.htmlEntity).toBe('&#x41;')
  })

  it('汉字的码位与区段', () => {
    const info = describeChar('工')
    expect(info.hex).toBe('U+5DE5')
    expect(info.block).toBe('CJK 基本汉字')
    expect(info.category).toBe('汉字')
  })

  it('emoji 使用 \\u{} 转义形式（码位超过 FFFF）', () => {
    const info = describeChar('😀')
    expect(info.codePoint).toBe(0x1f600)
    expect(info.jsEscape).toBe('\\u{1f600}')
    expect(info.category).toBe('emoji')
  })

  it('UTF-8 字节数：汉字 3 字节，emoji 4 字节', () => {
    expect(describeChar('工').utf8).toBe('E5 B7 A5')
    expect(describeChar('😀').utf8.split(' ')).toHaveLength(4)
  })
})

describe('unicode-lookup / blockOf', () => {
  it('未收录区段返回兜底文案', () => {
    expect(blockOf(0x0b00)).toBe('未收录区段')
  })
})

describe('unicode-lookup / transform', () => {
  it('多字符逐个列出', () => {
    const out = transform({ text: 'A工' })
    expect(out).toContain('U+0041')
    expect(out).toContain('U+5DE5')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' })).toBe('')
  })
})
