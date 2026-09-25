import { describe, expect, it } from 'vitest'
import { decodeBase32, encodeBase32, transform } from './utils'

const enc = { direction: 'encode' } as const
const dec = { direction: 'decode' } as const

describe('base32 / encode', () => {
  it('ASCII 文本编码（RFC 4648 已知值）', () => {
    expect(encodeBase32('hello')).toBe('NBSWY3DP')
  })

  it('长度对齐到 8 的倍数并补 =', () => {
    const encoded = encodeBase32('f')
    expect(encoded.length % 8).toBe(0)
    expect(encoded).toMatch(/=$/)
  })

  it('中文与 emoji 往返不丢字符', () => {
    for (const text of ['工具库', 'a🚀b', '中英 mix 123']) {
      expect(decodeBase32(encodeBase32(text))).toBe(text)
    }
  })

  it('输出只用 RFC 4648 字母表（不含 0/1/8/9）', () => {
    expect(encodeBase32('test string')).not.toMatch(/[0189]/)
  })
})

describe('base32 / decode', () => {
  it('小写输入可解码（大小写不敏感）', () => {
    expect(decodeBase32('nbswy3dp')).toBe('hello')
  })

  it('容忍空格与换行', () => {
    expect(decodeBase32('NBSW\nY3DP')).toBe('hello')
  })

  it('填充符可有可无', () => {
    expect(decodeBase32('MZXW6===')).toBe('foo')
    expect(decodeBase32('MZXW6')).toBe('foo')
  })

  it('字母表外的字符明确报错', () => {
    expect(() => decodeBase32('NB!WY3DP')).toThrow(/字母表之外的字符/)
  })
})

describe('base32 / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: 'hello' }, enc)).toBe('NBSWY3DP')
    expect(transform({ text: 'NBSWY3DP' }, dec)).toBe('hello')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, enc)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('非法输入抛出可读错误', () => {
    expect(() => transform({ text: '0O1I' }, dec)).toThrow(/解码失败/)
  })
})
