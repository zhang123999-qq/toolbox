import { describe, expect, it } from 'vitest'
import type { PassphraseOptions } from './schema'
import {
  WORD_COUNTS,
  WORDLIST,
  capitalize,
  generatePassphrase,
  parseWordCount,
  resolveSeparator,
  transform,
  wordPool,
} from './utils'

/** 确定性假随机源：LCG，同种子必得同一序列（单测里替代 CSPRNG） */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/** 恒为 0 的随机源：每次取词池里的第一个词，便于写死期望值 */
const alwaysZero = () => 0

const base: PassphraseOptions = {
  words: '4',
  separator: 'hyphen',
  noAmbiguous: false,
  uppercase: false,
}

describe('passphrase / 词表', () => {
  it('恰好 256 个词，全部唯一', () => {
    expect(WORDLIST).toHaveLength(256)
    expect(new Set(WORDLIST).size).toBe(256)
  })

  it('全部是小写英文短词（3~8 字母）', () => {
    for (const word of WORDLIST) expect(word).toMatch(/^[a-z]{3,8}$/)
  })

  it('排除易混字符后词池只剩不含 l / o 的词', () => {
    expect(wordPool(false)).toHaveLength(256)
    expect(wordPool(true)).toHaveLength(102)
    for (const word of wordPool(true)) expect(word).not.toMatch(/[lo]/)
  })
})

describe('passphrase / generatePassphrase', () => {
  it('固定随机源 → apple-apple-apple-apple（已知向量）', () => {
    expect(generatePassphrase(base, alwaysZero)).toBe('apple-apple-apple-apple')
  })

  it('排除易混字符后固定随机源 → autumn-autumn-autumn-autumn（已知向量）', () => {
    expect(generatePassphrase({ ...base, noAmbiguous: true }, alwaysZero)).toBe(
      'autumn-autumn-autumn-autumn',
    )
  })

  it('词数选项生效', () => {
    for (const words of WORD_COUNTS) {
      const phrase = generatePassphrase({ ...base, words }, seeded(7))
      expect(phrase.split('-')).toHaveLength(Number(words))
    }
  })

  it('四种分隔符都能生效', () => {
    expect(generatePassphrase({ ...base, separator: 'hyphen' }, alwaysZero)).toBe(
      'apple-apple-apple-apple',
    )
    expect(generatePassphrase({ ...base, separator: 'underscore' }, alwaysZero)).toBe(
      'apple_apple_apple_apple',
    )
    expect(generatePassphrase({ ...base, separator: 'space' }, alwaysZero)).toBe(
      'apple apple apple apple',
    )
    expect(generatePassphrase({ ...base, separator: 'dot' }, alwaysZero)).toBe(
      'apple.apple.apple.apple',
    )
    expect(resolveSeparator('space')).toBe(' ')
  })

  it('首字母大写选项生效', () => {
    expect(generatePassphrase({ ...base, uppercase: true }, alwaysZero)).toBe(
      'Apple-Apple-Apple-Apple',
    )
    expect(capitalize('apple')).toBe('Apple')
  })

  it('每个词都来自词池', () => {
    const phrase = generatePassphrase({ ...base, words: '6' }, seeded(11))
    for (const word of phrase.split('-')) expect(WORDLIST).toContain(word)
  })

  it('同种子结果一致，不同种子结果不同', () => {
    const first = generatePassphrase(base, seeded(42))
    expect(generatePassphrase(base, seeded(42))).toBe(first)
    expect(generatePassphrase(base, seeded(43))).not.toBe(first)
  })

  it('非法词数与非法分隔符报错', () => {
    const badCount = { ...base, words: '99' } as unknown as PassphraseOptions
    expect(() => parseWordCount('99')).toThrow(/不支持的词数/)
    expect(() => generatePassphrase(badCount)).toThrow(/不支持的词数/)
    expect(() => resolveSeparator('comma')).toThrow(/不支持的分隔符/)
  })
})

describe('passphrase / transform', () => {
  it('空输入返回空串，且不触碰随机源（边界）', () => {
    let called = false
    const spy = () => {
      called = true
      return 0
    }
    expect(transform({ text: '' }, base, spy)).toBe('')
    expect(called).toBe(false)
  })

  it('输入非空即可触发生成', () => {
    expect(transform({ text: 'generate' }, base, alwaysZero)).toBe('apple-apple-apple-apple')
  })

  it('输入超过上限时报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('默认随机源走 CSPRNG：两次结果不同', () => {
    const first = transform({ text: 'generate' }, base)
    const second = transform({ text: 'generate' }, base)
    expect(first.split('-')).toHaveLength(4)
    expect(first).not.toBe(second)
  })
})
