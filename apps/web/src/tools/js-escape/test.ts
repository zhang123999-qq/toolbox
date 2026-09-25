import { describe, expect, it } from 'vitest'
import { escapeJsString, transform, unescapeJsString } from './utils'

const single = { direction: 'escape', quote: 'single' } as const
const double = { direction: 'escape', quote: 'double' } as const
const un = { direction: 'unescape', quote: 'single' } as const

describe('js-escape / escape', () => {
  it('反斜杠自身还原成双反斜杠', () => {
    expect(escapeJsString('C:\\tmp', 'single')).toBe('C:\\\\tmp')
  })

  it('只转义当前定界引号（single 不碰双引号）', () => {
    expect(escapeJsString("a'b", 'single')).toBe("a\\'b")
    expect(escapeJsString('a"b', 'single')).toBe('a"b')
  })

  it('只转义当前定界引号（double 不碰单引号）', () => {
    expect(escapeJsString('a"b', 'double')).toBe('a\\"b')
    expect(escapeJsString("a'b", 'double')).toBe("a'b")
  })

  it('控制字符用专用写法', () => {
    expect(escapeJsString('a\nb\tc', 'single')).toBe('a\\nb\\tc')
    expect(escapeJsString('\u0000\b\v\f\r', 'single')).toBe('\\0\\b\\v\\f\\r')
  })

  it('没有专用写法的控制字符落到 \\uXXXX', () => {
    expect(escapeJsString('a\u0001b', 'single')).toBe('a\\u0001b')
  })

  it('中文与 emoji 保持原样', () => {
    expect(escapeJsString('中文🚀', 'single')).toBe('中文🚀')
  })
})

describe('js-escape / unescape', () => {
  it('还原专用转义', () => {
    expect(unescapeJsString('a\\nb')).toBe('a\nb')
    expect(unescapeJsString('\\0\\b\\t\\v\\f\\r')).toBe('\u0000\b\t\v\f\r')
  })

  it('还原 \\uXXXX 与 \\xHH', () => {
    expect(unescapeJsString('\\u4E2D\\u6587')).toBe('中文')
    expect(unescapeJsString('\\x41\\x42')).toBe('AB')
  })

  it('还原引号转义', () => {
    expect(unescapeJsString('\\\'\\"')).toBe('\'"')
  })

  it('未知转义按 JS 语义取字符本身', () => {
    expect(unescapeJsString('\\z')).toBe('z')
  })
})

describe('js-escape / transform', () => {
  it('按选项方向与引号风格执行', () => {
    expect(transform({ text: 'a"b' }, double)).toBe('a\\"b')
    expect(transform({ text: 'a\\"b' }, un)).toBe('a"b')
  })

  it('往返一致（引号 + 反斜杠 + 控制字符 + 中文 emoji）', () => {
    const text = 'a\'b"c\\d\ne\tf\u0001g 中文🚀'
    expect(transform({ text: transform({ text }, single) }, un)).toBe(text)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, single)).toBe('')
    expect(transform({ text: '' }, un)).toBe('')
  })

  it('非法转义抛出可读错误', () => {
    expect(() => transform({ text: '\\u12' }, un)).toThrow(/不合法的 \\u 转义/)
    expect(() => transform({ text: 'abc\\' }, un)).toThrow(/孤立的反斜杠/)
  })
})
