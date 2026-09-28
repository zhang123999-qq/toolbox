import { describe, expect, it } from 'vitest'
import type { ShortIdOptions } from './schema'
import {
  AMBIGUOUS,
  CHARSET_KEYS,
  CHARSETS,
  generateShortId,
  MAX_LENGTH,
  MIN_LENGTH,
  parseLength,
  resolveCharset,
  secureRandomIndex,
  transform,
} from './utils'

const base: ShortIdOptions = {
  length: '8',
  charset: 'alnum',
  noAmbiguous: false,
  customCharset: '',
}

describe('short-id / parseLength', () => {
  it('合法长度通过', () => {
    expect(parseLength('8')).toBe(8)
    expect(parseLength(String(MIN_LENGTH))).toBe(4)
    expect(parseLength(String(MAX_LENGTH))).toBe(32)
  })
  it('非整数抛错', () => {
    expect(() => parseLength('abc')).toThrow(/长度必须是整数/)
    expect(() => parseLength('3.5')).toThrow(/长度必须是整数/)
  })
  it('越界抛错', () => {
    expect(() => parseLength('3')).toThrow(/长度必须在/)
    expect(() => parseLength('33')).toThrow(/长度必须在/)
  })
})

describe('short-id / resolveCharset', () => {
  it('预设字符集正确', () => {
    expect(resolveCharset(base)).toBe(CHARSETS.alnum)
    expect(resolveCharset({ ...base, charset: 'hex' })).toBe(CHARSETS.hex)
    expect(resolveCharset({ ...base, charset: 'alpha' })).toBe(CHARSETS.alpha)
  })
  it('custom 用自定义字符集', () => {
    expect(resolveCharset({ ...base, charset: 'custom', customCharset: 'xyz' })).toBe('xyz')
  })
  it('custom 为空抛错', () => {
    expect(() => resolveCharset({ ...base, charset: 'custom', customCharset: '' })).toThrow(
      /自定义字符集不能为空/,
    )
  })
  it('noAmbiguous 剔除易混字符', () => {
    const c = resolveCharset({ ...base, noAmbiguous: true })
    for (const ch of AMBIGUOUS) expect(c).not.toContain(ch)
    expect(c.length).toBeGreaterThan(0)
  })
  it('剔除后为空抛错', () => {
    expect(() =>
      resolveCharset({ ...base, charset: 'custom', customCharset: '0OIl', noAmbiguous: true }),
    ).toThrow(/排除易混淆字符后字符集为空/)
  })
  it('未知预设抛错', () => {
    expect(() => resolveCharset({ ...base, charset: 'bogus' })).toThrow(/未知的字符集预设/)
  })
})

describe('short-id / secureRandomIndex', () => {
  it('落在 [0, max) 内', () => {
    for (let i = 0; i < 200; i++) {
      const v = secureRandomIndex(62)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(62)
    }
  })
})

describe('short-id / generateShortId', () => {
  it('长度正确', () => {
    for (const length of [4, 8, 16, 32]) {
      expect(generateShortId({ ...base, length: String(length) })).toHaveLength(length)
    }
  })
  it('hex 只含十六进制字符', () => {
    const id = generateShortId({ ...base, length: '20', charset: 'hex' })
    expect(id).toMatch(/^[0-9a-f]{20}$/)
  })
  it('custom 字符集生效', () => {
    const id = generateShortId({ ...base, length: '10', charset: 'custom', customCharset: 'ab' })
    expect(id).toMatch(/^[ab]{10}$/)
  })
  it('noAmbiguous 后不含 Il1O0o', () => {
    const id = generateShortId({ ...base, length: '32', noAmbiguous: true })
    for (const ch of id) expect(AMBIGUOUS.includes(ch)).toBe(false)
  })
  it('多次生成唯一性', () => {
    const set = new Set<string>()
    for (let i = 0; i < 200; i++) set.add(generateShortId(base))
    expect(set.size).toBe(200)
  })
  it('预设键覆盖完整', () => {
    expect(CHARSET_KEYS).toContain('alnum')
    expect(CHARSET_KEYS).toContain('hex')
    expect(CHARSET_KEYS).toContain('custom')
  })
})

describe('short-id / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('正常生成 8 位 alnum', () => {
    expect(transform({ text: 'x' }, base)).toMatch(/^[A-Za-z0-9]{8}$/)
  })
  it('非法长度抛错', () => {
    expect(() => transform({ text: 'x' }, { ...base, length: '0' })).toThrow(/长度必须在/)
  })
  it('custom 空字符集抛错', () => {
    expect(() =>
      transform({ text: 'x' }, { ...base, charset: 'custom', customCharset: '' }),
    ).toThrow(/自定义字符集不能为空/)
  })
})
