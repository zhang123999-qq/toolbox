import { describe, expect, it } from 'vitest'
import {
  BIT_PATTERNS,
  STOP_BITS,
  computeChecksum,
  encodeCode128B,
  parseHeight,
  parseLineWidth,
  renderSvg,
  transform,
} from './utils'

describe('barcode / 符号表', () => {
  it('0–105 各为 11 位图案，终止符 13 位', () => {
    expect(BIT_PATTERNS).toHaveLength(106)
    for (const p of BIT_PATTERNS) {
      expect(p).toMatch(/^[01]{11}$/)
    }
    expect(STOP_BITS).toMatch(/^[01]{13}$/)
  })
})

describe('barcode / computeChecksum', () => {
  it('单个字符 A：起始 104 + 33 = 137，mod 103 = 34', () => {
    expect(computeChecksum([33])).toBe(34)
  })

  it('与权威示例 CSE370(START A) 同公式：加权和 mod 103', () => {
    // 该示例用 START A=103，此处仅验证加权公式本身
    const sum = 103 + 35 * 1 + 51 * 2 + 37 * 3 + 19 * 4 + 23 * 5 + 16 * 6
    expect(((sum % 103) + 103) % 103).toBe(20)
  })
})

describe('barcode / encodeCode128B', () => {
  it('空格..波浪线映射正确：A=65→33，0=48→16', () => {
    const e = encodeCode128B('A0')
    expect(e.values).toEqual([104, 33, 16, e.checksum])
    expect(e.checksum).toBe((((104 + 33 + 2 * 16) % 103) + 103) % 103)
  })

  it('位串含起始、数据、校验、终止', () => {
    const e = encodeCode128B('AB')
    expect(e.values[0]).toBe(104)
    expect(e.values[e.values.length - 1]).toBe(e.checksum)
    // 每个符号 11 位 + 终止 13 位
    expect(e.bits.length).toBe(e.values.length * 11 + 13)
    expect(e.bits.endsWith(STOP_BITS)).toBe(true)
  })

  it('空串返回空', () => {
    expect(encodeCode128B('')).toEqual({ values: [], bits: '', checksum: 0 })
  })

  it('非 ASCII 可打印字符抛中文错', () => {
    expect(() => encodeCode128B('汉字')).toThrow(/非 ASCII 可打印字符/)
    expect(() => encodeCode128B('a\nb')).toThrow(/非 ASCII 可打印字符/)
  })
})

describe('barcode / parseHeight & parseLineWidth', () => {
  it('默认值与边界', () => {
    expect(parseHeight('')).toBe(80)
    expect(parseHeight('20')).toBe(20)
    expect(parseHeight('200')).toBe(200)
    expect(() => parseHeight('19')).toThrow(/条高无效/)
    expect(() => parseHeight('201')).toThrow(/条高无效/)
    expect(parseLineWidth('')).toBe(2)
    expect(() => parseLineWidth('0')).toThrow(/线宽无效/)
    expect(() => parseLineWidth('6')).toThrow(/线宽无效/)
  })
})

describe('barcode / renderSvg', () => {
  it('输出合法 SVG，含黑条矩形与文本', () => {
    const e = encodeCode128B('12345678')
    const svg = renderSvg(e.bits, '12345678', { height: 80, lineWidth: 2, showText: true })
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect')
    expect(svg).toContain('<text')
  })

  it('showText=false 时不含 text 元素', () => {
    const e = encodeCode128B('AB')
    const svg = renderSvg(e.bits, 'AB', { height: 80, lineWidth: 2, showText: false })
    expect(svg).not.toContain('<text')
  })
})

describe('barcode / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { height: '80', lineWidth: '2', showText: true })).toBe('')
  })

  it('正常输出含注释与 SVG', () => {
    const out = transform({ text: 'HELLO' }, { height: '80', lineWidth: '2', showText: true })
    expect(out).toContain('<!-- Code128 B')
    expect(out).toContain('<svg')
  })

  it('非法高度抛中文错', () => {
    expect(() =>
      transform({ text: 'HELLO' }, { height: '5', lineWidth: '2', showText: true }),
    ).toThrow(/条高无效/)
  })

  it('非 ASCII 字符抛错', () => {
    expect(() =>
      transform({ text: '你好' }, { height: '80', lineWidth: '2', showText: true }),
    ).toThrow(/非 ASCII/)
  })
})
