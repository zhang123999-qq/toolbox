import { describe, expect, it } from 'vitest'
import {
  EncodingConvertError,
  SUPPORTED_ENCODINGS,
  decodeBytes,
  encodeText,
  formatBytes,
  parseInput,
  toBase64,
  toHex,
  toLatin1,
  transform,
} from './utils'
import type { EncodingConvertInput, EncodingConvertOptions } from './schema'

function options(
  direction: 'encode' | 'decode',
  encoding: EncodingConvertOptions['encoding'] = 'gbk',
  format: EncodingConvertOptions['format'] = 'hex',
): EncodingConvertOptions {
  return { direction, encoding, format }
}

describe('encoding-convert / transform', () => {
  it('encode：中文文本按 GBK 编成字节（十六进制）', () => {
    expect(transform({ text: '工具箱' }, options('encode', 'gbk', 'hex'))).toBe('b9a4bedfcfe4')
  })

  it('decode：GBK 字节还原为中文，且与 encode 互补', () => {
    const bytes = transform({ text: '上海地铁' }, options('encode', 'gbk', 'hex'))
    expect(transform({ text: bytes }, options('decode', 'gbk', 'hex'))).toBe('上海地铁')
  })

  it('三种字节写法互转一致', () => {
    const input: EncodingConvertInput = { text: '中文 abc' }
    const hex = transform(input, options('encode', 'gbk', 'hex'))
    const base64 = transform(input, options('encode', 'gbk', 'base64'))
    const latin1 = transform(input, options('encode', 'gbk', 'latin1'))
    expect(hex).toBe('d6d0cec420616263')
    expect(base64).toBe('1tDOxCBhYmM=')
    expect(latin1.length).toBe(8)
    expect(transform({ text: base64 }, options('decode', 'gbk', 'base64'))).toBe('中文 abc')
    expect(transform({ text: latin1 }, options('decode', 'gbk', 'latin1'))).toBe('中文 abc')
  })

  it('UTF-16 两种字节序都要能写也能读回', () => {
    const le = transform({ text: '甲' }, options('encode', 'utf-16le', 'hex'))
    const be = transform({ text: '甲' }, options('encode', 'utf-16be', 'hex'))
    expect(le).toBe('3275')
    expect(be).toBe('7532')
    expect(transform({ text: le }, options('decode', 'utf-16le', 'hex'))).toBe('甲')
    expect(transform({ text: be }, options('decode', 'utf-16be', 'hex'))).toBe('甲')
  })

  it('UTF-8 走原生 TextEncoder，超出字符集的字符不被静默丢弃', () => {
    expect(transform({ text: 'é' }, options('encode', 'utf-8', 'hex'))).toBe('c3a9')
    expect(transform({ text: 'ASCII' }, options('encode', 'iso-8859-1', 'hex'))).toBe('4153434949')
    expect(() => transform({ text: 'A中' }, options('encode', 'iso-8859-1', 'hex'))).toThrow(
      /iso-8859-1 里没有这些字符/,
    )
  })

  it('Big5 / Shift_JIS / EUC-KR 各自的字符集都走得通', () => {
    expect(transform({ text: '中文' }, options('encode', 'big5', 'hex'))).toBe('a4a4a4e5')
    expect(transform({ text: 'テスト' }, options('encode', 'shift_jis', 'hex'))).toBe(
      '836583588367',
    )
    expect(transform({ text: '안녕' }, options('encode', 'euc-kr', 'hex'))).toBe(
      'be c8 b3 e7'.replace(/ /g, ''),
    )
  })

  it('字符集里没有的字符直接报错而不是静默丢字（异常）', () => {
    expect(() => transform({ text: '中文 🚀' }, options('encode', 'gbk', 'hex'))).toThrow(
      EncodingConvertError,
    )
    expect(() => transform({ text: '中文 🚀' }, options('encode', 'gbk', 'hex'))).toThrow(
      /字符集 gbk 里没有这些字符/,
    )
  })

  it('环境不支持的编码给出明确中文报错（异常）', () => {
    expect(() => decodeBytes(new Uint8Array([0x41]), 'utf-32')).toThrow(EncodingConvertError)
    expect(() => decodeBytes(new Uint8Array([0x41]), 'utf-32')).toThrow(/不支持的编码/)
    expect(SUPPORTED_ENCODINGS).toContain('gb18030')
  })

  it('字节侧输入非法时逐一说明原因（异常）', () => {
    expect(() => transform({ text: 'zzz' }, options('decode', 'utf-8', 'hex'))).toThrow(
      EncodingConvertError,
    )
    expect(() => transform({ text: 'abc' }, options('decode', 'utf-8', 'hex'))).toThrow(
      /长度必须是偶数/,
    )
    expect(() => transform({ text: '!!!' }, options('decode', 'utf-8', 'base64'))).toThrow(
      EncodingConvertError,
    )
    expect(() => transform({ text: '中文' }, options('decode', 'utf-8', 'latin1'))).toThrow(
      /不是单字节的乱码串/,
    )
  })

  it('十六进制容忍空格与 0x 前缀（边界）', () => {
    expect(toHex(parseInput('0xA4 A4', 'hex'))).toBe('a4a4')
    expect(transform({ text: 'A4 A4' }, options('decode', 'big5', 'hex'))).toBe('中')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, options('encode'))).toBe('')
    expect(transform({ text: '  \n ' }, options('decode'))).toBe('')
    expect(transform({ text: '' }, options('decode', 'utf-8', 'base64'))).toBe('')
  })

  it('超长输入抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: 'a'.repeat(500_001) }, options('encode'))).toThrow(
      EncodingConvertError,
    )
  })

  it('编解码函数可直接复用：反推表能覆盖常见汉字区间', () => {
    const text = '中华人民共和国共八百七十个工具'
    const bytes = encodeText(text, 'gb18030')
    expect(decodeBytes(bytes, 'gb18030')).toBe(text)
    expect(toBase64(bytes)).toBe(toBase64(encodeText(text, 'gbk')))
    expect(toLatin1(bytes)).toHaveLength(bytes.length)
    expect(formatBytes(bytes, 'hex')).toBe(toHex(bytes))
  })
})
