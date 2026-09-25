import { describe, expect, it } from 'vitest'
import { decodeBase58, encodeBase58, transform } from './utils'

const enc = { direction: 'encode', mode: 'bitcoin' } as const
const dec = { direction: 'decode', mode: 'bitcoin' } as const
const encFlickr = { direction: 'encode', mode: 'flickr' } as const

describe('base58 / encode', () => {
  it('ASCII 文本编码（Bitcoin 字母表已知值）', () => {
    expect(encodeBase58('hello world', 'bitcoin')).toBe('StV1DL6CwTryKyV')
  })

  it('输出不含易混淆字符 0/O/I/l', () => {
    expect(encodeBase58('hello world', 'bitcoin')).not.toMatch(/[0OIl]/)
  })

  it('前导零字节映射为字母表首字符（Bitcoin 下为 1）', () => {
    expect(encodeBase58('\u0000hello', 'bitcoin').startsWith('1')).toBe(true)
  })

  it('中文与 emoji 往返不丢字符', () => {
    for (const text of ['工具库', 'a🚀b']) {
      expect(decodeBase58(encodeBase58(text, 'bitcoin'), 'bitcoin')).toBe(text)
    }
  })

  it('Flickr 字母表输出与 Bitcoin 不同', () => {
    expect(encodeBase58('hello world', 'flickr')).not.toBe(encodeBase58('hello world', 'bitcoin'))
  })
})

describe('base58 / decode', () => {
  it('解回原始文本', () => {
    expect(decodeBase58('StV1DL6CwTryKyV', 'bitcoin')).toBe('hello world')
  })

  it('Flickr 与 Bitcoin 互不通用（用错字母表应报错）', () => {
    const flickr = encodeBase58('hello world', 'flickr')
    expect(() => decodeBase58(flickr, 'bitcoin')).toThrow()
  })

  it('字母表外的字符明确报错', () => {
    expect(() => decodeBase58('0OIl', 'bitcoin')).toThrow(/字母表之外的字符/)
  })

  it('容忍空白与换行', () => {
    expect(decodeBase58('StV1DL6C\nwTryKyV', 'bitcoin')).toBe('hello world')
  })
})

describe('base58 / transform', () => {
  it('按选项方向与字母表执行', () => {
    expect(transform({ text: 'hello world' }, enc)).toBe('StV1DL6CwTryKyV')
    expect(transform({ text: 'StV1DL6CwTryKyV' }, dec)).toBe('hello world')
    expect(transform({ text: 'hello world' }, encFlickr)).toBeDefined()
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, enc)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('非法输入抛出可读错误', () => {
    expect(() => transform({ text: '0OIl' }, dec)).toThrow(/解码失败/)
  })
})
