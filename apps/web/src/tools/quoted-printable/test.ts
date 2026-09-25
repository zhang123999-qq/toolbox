import { describe, expect, it } from 'vitest'
import { decodeQuotedPrintable, encodeQuotedPrintable, parseLineLength, transform } from './utils'

const enc = { direction: 'encode', length: '76' } as const
const dec = { direction: 'decode', length: '76' } as const

describe('quoted-printable / 编码', () => {
  it('非 ASCII 字符按 UTF-8 字节转义', () => {
    expect(encodeQuotedPrintable('中', 76)).toBe('=E4=B8=AD')
    expect(encodeQuotedPrintable('é', 76)).toBe('=C3=A9')
  })

  it('可打印 ASCII 原样保留（只有 = 需要转义）', () => {
    expect(encodeQuotedPrintable('Hello World', 76)).toBe('Hello World')
    expect(encodeQuotedPrintable('a=b?', 76)).toBe('a=3Db?')
  })

  it('行尾空格必须转义', () => {
    expect(encodeQuotedPrintable('Hello ', 76)).toBe('Hello=20')
    expect(encodeQuotedPrintable('a\t', 76)).toBe('a=09')
  })

  it('换行统一写成 CRLF', () => {
    expect(encodeQuotedPrintable('a\nb', 76)).toBe('a\r\nb')
  })

  it('超长行插入软换行，每行不超过设定长度', () => {
    const encoded = encodeQuotedPrintable('A'.repeat(100), 76)
    expect(encoded).toBe('A'.repeat(75) + '=\r\n' + 'A'.repeat(25))
    for (const line of encoded.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(76)
    }
  })

  it('每行长度可调（按 8 折行）', () => {
    expect(encodeQuotedPrintable('A'.repeat(10), 8)).toBe('AAAAAAA=\r\nAAA')
  })
})

describe('quoted-printable / 解码', () => {
  it('=XX 还原成对应字节', () => {
    expect(decodeQuotedPrintable('=E4=B8=AD')).toBe('中')
  })

  it('软换行被去掉', () => {
    expect(decodeQuotedPrintable('a=\r\nb')).toBe('ab')
    expect(decodeQuotedPrintable('a=\nb')).toBe('ab')
  })

  it('CRLF 统一还原为 LF', () => {
    expect(decodeQuotedPrintable('a\r\nb')).toBe('a\nb')
  })
})

describe('quoted-printable / transform', () => {
  it('按方向执行', () => {
    expect(transform({ text: '中' }, enc)).toBe('=E4=B8=AD')
    expect(transform({ text: '=E4=B8=AD' }, dec)).toBe('中')
  })

  it('中英混排 + emoji + 多行往返一致', () => {
    const text = '中文 abc 🚀\n第二行 with 空格 \n=结尾'
    expect(decodeQuotedPrintable(encodeQuotedPrintable(text, 76))).toBe(text)
  })

  it('长文本折行后仍能往返一致', () => {
    const text = '汉字与 ASCII 混排的较长内容 '.repeat(40)
    expect(decodeQuotedPrintable(encodeQuotedPrintable(text, 76))).toBe(text)
  })

  it('空串返回空串（边界）', () => {
    expect(transform({ text: '' }, enc)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('非法 = 转义报错', () => {
    expect(() => transform({ text: '=ZZ' }, dec)).toThrow(/转义不合法/)
  })

  it('行尾悬空的 = 报错', () => {
    expect(() => transform({ text: 'abc=' }, dec)).toThrow(/转义不合法/)
  })

  it('每行长度非法时报错', () => {
    expect(() => parseLineLength('0')).toThrow(/需在 8–76 之间/)
    expect(() => parseLineLength('abc')).toThrow(/不是整数/)
    expect(() => transform({ text: 'abc' }, { direction: 'encode', length: '100' })).toThrow(
      /需在 8–76 之间/,
    )
  })
})
