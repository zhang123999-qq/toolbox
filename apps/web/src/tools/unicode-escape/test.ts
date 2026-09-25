import { describe, expect, it } from 'vitest'
import { escapeUnicode, transform, unescapeUnicode } from './utils'

const esc = { direction: 'escape' } as const
const un = { direction: 'unescape' } as const

describe('unicode-escape / escape', () => {
  it('ASCII 字符保持原样', () => {
    expect(escapeUnicode('Hello, world! 123')).toBe('Hello, world! 123')
  })

  it('BMP 内的非 ASCII 转成 \\uXXXX（四位大写十六进制）', () => {
    expect(escapeUnicode('中')).toBe('\\u4E2D')
    expect(escapeUnicode('工具库')).toBe('\\u5DE5\\u5177\\u5E93')
  })

  it('码点超过 0xFFFF 的字符用 \\u{XXXXX} 写法', () => {
    expect(escapeUnicode('🚀')).toBe('\\u{1F680}')
  })

  it('ASCII 与中文混排时只动非 ASCII 部分', () => {
    expect(escapeUnicode('Toolbox 工具库')).toBe('Toolbox \\u5DE5\\u5177\\u5E93')
  })
})

describe('unicode-escape / unescape', () => {
  it('还原 \\uXXXX', () => {
    expect(unescapeUnicode('\\u4E2D\\u6587')).toBe('中文')
  })

  it('还原 \\u{XXXXX}', () => {
    expect(unescapeUnicode('\\u{1F680}')).toBe('🚀')
  })

  it('还原代理对写法（两个 \\uXXXX 拼回一个字符）', () => {
    expect(unescapeUnicode('\\uD83D\\uDE80')).toBe('🚀')
  })

  it('十六进制大小写都能识别', () => {
    expect(unescapeUnicode('\\u4e2d')).toBe('中')
  })
})

describe('unicode-escape / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: '中' }, esc)).toBe('\\u4E2D')
    expect(transform({ text: '\\u4E2D' }, un)).toBe('中')
  })

  it('往返一致（ASCII + 中文 + emoji）', () => {
    const text = 'Toolbox 工具库 🚀 ok'
    expect(transform({ text: transform({ text }, esc) }, un)).toBe(text)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, esc)).toBe('')
    expect(transform({ text: '' }, un)).toBe('')
  })

  it('非法 \\u 转义抛出可读错误', () => {
    expect(() => transform({ text: '\\u12' }, un)).toThrow(/不合法的 \\u 转义/)
    expect(() => transform({ text: '\\u{}' }, un)).toThrow(/不合法的 \\u\{\.\.\.\} 转义/)
  })

  it('码点超出 Unicode 范围时报错', () => {
    expect(() => transform({ text: '\\u{110000}' }, un)).toThrow(/超出 Unicode 范围/)
  })
})
