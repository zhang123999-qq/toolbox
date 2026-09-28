import { describe, expect, it } from 'vitest'
import type { NanoidOptions } from './schema'
import {
  DEFAULT_ALPHABET,
  generateNanoId,
  MAX_LENGTH,
  MIN_LENGTH,
  parseLength,
  resolveAlphabet,
  secureRandomIndex,
  transform,
} from './utils'

const base: NanoidOptions = { length: '21', alphabet: DEFAULT_ALPHABET }
const URL_SAFE = /^[A-Za-z0-9_-]+$/

describe('nanoid / parseLength', () => {
  it('合法长度通过', () => {
    expect(parseLength('21')).toBe(21)
    expect(parseLength(String(MIN_LENGTH))).toBe(1)
    expect(parseLength(String(MAX_LENGTH))).toBe(64)
  })
  it('非整数抛错', () => {
    expect(() => parseLength('abc')).toThrow(/长度必须是整数/)
    expect(() => parseLength('1.5')).toThrow(/长度必须是整数/)
  })
  it('越界抛错', () => {
    expect(() => parseLength('0')).toThrow(/长度必须在/)
    expect(() => parseLength('65')).toThrow(/长度必须在/)
  })
})

describe('nanoid / resolveAlphabet', () => {
  it('默认字母表为 URL 安全 64 字符', () => {
    expect(resolveAlphabet(base)).toBe(DEFAULT_ALPHABET)
    expect(DEFAULT_ALPHABET).toHaveLength(64)
    expect(DEFAULT_ALPHABET).toMatch(URL_SAFE)
  })
  it('空字母表抛错', () => {
    expect(() => resolveAlphabet({ ...base, alphabet: '' })).toThrow(/字母表不能为空/)
  })
})

describe('nanoid / secureRandomIndex', () => {
  it('落在 [0, max) 内', () => {
    for (let i = 0; i < 200; i++) {
      const v = secureRandomIndex(64)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(64)
    }
  })
})

describe('nanoid / generateNanoId', () => {
  it('长度正确', () => {
    for (const length of [1, 10, 21, 64]) {
      expect(generateNanoId({ ...base, length: String(length) })).toHaveLength(length)
    }
  })
  it('默认字母表下全部 URL 安全', () => {
    const id = generateNanoId(base)
    expect(id).toHaveLength(21)
    expect(id).toMatch(URL_SAFE)
  })
  it('自定义字母表生效', () => {
    const id = generateNanoId({ ...base, length: '30', alphabet: 'ab' })
    expect(id).toMatch(/^[ab]{30}$/)
  })
  it('多次生成唯一性', () => {
    const set = new Set<string>()
    for (let i = 0; i < 200; i++) set.add(generateNanoId(base))
    expect(set.size).toBe(200)
  })
})

describe('nanoid / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('正常生成 21 位 URL 安全 ID', () => {
    expect(transform({ text: 'x' }, base)).toMatch(/^[A-Za-z0-9_-]{21}$/)
  })
  it('非法长度抛错', () => {
    expect(() => transform({ text: 'x' }, { ...base, length: '0' })).toThrow(/长度必须在/)
  })
  it('空字母表抛错', () => {
    expect(() => transform({ text: 'x' }, { ...base, alphabet: '' })).toThrow(/字母表不能为空/)
  })
})
