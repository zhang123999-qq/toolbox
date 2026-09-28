import { describe, expect, it } from 'vitest'
import type { RandomStringOptions } from './schema'
import {
  CHARSET_KEYS,
  CHARSETS,
  generateString,
  MAX_LENGTH,
  MIN_LENGTH,
  parseLength,
  resolveCharset,
  secureRandomIndex,
  transform,
} from './utils'

const base: RandomStringOptions = { length: '32', charset: 'alnum', customCharset: '' }

describe('random-string / parseLength', () => {
  it('合法长度通过', () => {
    expect(parseLength('32')).toBe(32)
    expect(parseLength(String(MIN_LENGTH))).toBe(1)
    expect(parseLength(String(MAX_LENGTH))).toBe(512)
  })
  it('非整数抛错', () => {
    expect(() => parseLength('abc')).toThrow(/长度必须是整数/)
    expect(() => parseLength('3.5')).toThrow(/长度必须是整数/)
  })
  it('越界抛错', () => {
    expect(() => parseLength('0')).toThrow(/长度必须在/)
    expect(() => parseLength('513')).toThrow(/长度必须在/)
  })
})

describe('random-string / resolveCharset', () => {
  it('预设字符集正确', () => {
    expect(resolveCharset({ ...base, charset: 'hex' })).toBe(CHARSETS.hex)
    expect(resolveCharset({ ...base, charset: 'numeric' })).toBe(CHARSETS.numeric)
    expect(resolveCharset({ ...base, charset: 'base64' })).toBe(CHARSETS.base64)
  })
  it('custom 用自定义字符集', () => {
    expect(resolveCharset({ ...base, charset: 'custom', customCharset: 'xyz' })).toBe('xyz')
  })
  it('custom 为空抛错', () => {
    expect(() => resolveCharset({ ...base, charset: 'custom', customCharset: '' })).toThrow(
      /自定义字符集不能为空/,
    )
  })
  it('未知预设抛错', () => {
    expect(() => resolveCharset({ ...base, charset: 'bogus' })).toThrow(/未知的字符集预设/)
  })
})

describe('random-string / secureRandomIndex', () => {
  it('落在 [0, max) 内', () => {
    for (let i = 0; i < 200; i++) {
      const v = secureRandomIndex(16)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(16)
    }
  })
})

describe('random-string / generateString', () => {
  it('长度正确', () => {
    for (const length of [1, 16, 64, 512]) {
      expect(generateString({ ...base, length: String(length) })).toHaveLength(length)
    }
  })
  it('hex 字符全部属于 0-9a-f', () => {
    const out = generateString({ ...base, length: '100', charset: 'hex' })
    expect(out).toMatch(/^[0-9a-f]{100}$/)
  })
  it('numeric 只含数字', () => {
    expect(generateString({ ...base, length: '50', charset: 'numeric' })).toMatch(/^\d{50}$/)
  })
  it('custom 字符集生效', () => {
    const out = generateString({ ...base, length: '100', charset: 'custom', customCharset: 'ab' })
    expect(out).toMatch(/^[ab]{100}$/)
  })
  it('多次生成唯一性', () => {
    const set = new Set<string>()
    for (let i = 0; i < 100; i++) set.add(generateString(base))
    expect(set.size).toBe(100)
  })
  it('预设键覆盖完整', () => {
    expect(CHARSET_KEYS).toContain('alnum')
    expect(CHARSET_KEYS).toContain('custom')
  })
})

describe('random-string / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('正常生成 32 位 alnum', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toHaveLength(32)
    expect(out).toMatch(/^[A-Za-z0-9]{32}$/)
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
