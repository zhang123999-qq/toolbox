import { describe, expect, it } from 'vitest'
import { decodeAscii85, decodeZ85, encodeAscii85, encodeZ85, transform } from './utils'

const a85enc = { direction: 'encode', mode: 'ascii85' } as const
const a85dec = { direction: 'decode', mode: 'ascii85' } as const
const z85enc = { direction: 'encode', mode: 'z85' } as const
const z85dec = { direction: 'decode', mode: 'z85' } as const

describe('base85-codec / ascii85', () => {
  it('4 字节整组编码（规范已知值）', () => {
    expect(encodeAscii85('Man ')).toBe('9jqo^')
  })

  it('少于 4 字节的末组按实际长度输出', () => {
    expect(encodeAscii85('Man')).toHaveLength(4)
    expect(decodeAscii85(encodeAscii85('Man'))).toBe('Man')
  })

  it('全零整组缩写为 z，解码可还原', () => {
    const encoded = encodeAscii85('\u0000\u0000\u0000\u0000')
    expect(encoded).toBe('z')
    expect(decodeAscii85(encoded)).toBe('\u0000\u0000\u0000\u0000')
  })

  it('中文与 emoji 往返不丢字符', () => {
    for (const text of ['工具库', 'a🚀b']) {
      expect(decodeAscii85(encodeAscii85(text))).toBe(text)
    }
  })

  it('可解析 <~ ~> 包裹形式', () => {
    expect(decodeAscii85('<~9jqo^~>')).toBe('Man ')
  })

  it('比 Base64 更紧凑（4 字节 → 5 字符 vs 8 字符）', () => {
    expect(encodeAscii85('Man ').length).toBeLessThan(btoa('Man ').length)
  })
})

describe('base85-codec / z85', () => {
  it('4 字节整组编码并往返', () => {
    const encoded = encodeZ85('Man ')
    expect(encoded).toHaveLength(5)
    expect(decodeZ85(encoded)).toBe('Man ')
  })

  it('不足 4 字节补零后仍能解出原文前缀', () => {
    expect(decodeZ85(encodeZ85('Man')).startsWith('Man')).toBe(true)
  })

  it('长度不是 5 的倍数时报错', () => {
    expect(() => decodeZ85('abc')).toThrow(/5 的倍数/)
  })

  it('字母表外的字符明确报错', () => {
    // 注意 `@` 是 Z85 字母表里的合法字符（表尾是 @%$#），要挑真正表外的，比如 `~`
    expect(() => decodeZ85('~~~~~')).toThrow(/字母表之外的字符/)
  })
})

describe('base85-codec / transform', () => {
  it('按选项方向与变体执行', () => {
    expect(transform({ text: 'Man ' }, a85enc)).toBe('9jqo^')
    expect(transform({ text: '9jqo^' }, a85dec)).toBe('Man ')
    expect(transform({ text: 'Man ' }, z85enc)).toHaveLength(5)
    expect(transform({ text: encodeZ85('Man ') }, z85dec)).toBe('Man ')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, a85enc)).toBe('')
    expect(transform({ text: '' }, z85dec)).toBe('')
  })

  it('非法输入抛出可读错误', () => {
    expect(() => transform({ text: '@@@@@' }, z85dec)).toThrow(/解码失败/)
  })
})
