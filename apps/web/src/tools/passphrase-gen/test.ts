import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  capitalize,
  generatePassphrase,
  MAX_SEPARATOR_LENGTH,
  MAX_WORDS,
  parseSeparator,
  parseWordCount,
  secureRandom,
  transform,
  WORDS,
} from './utils'

const t = createTranslator('zh')
const enT = createTranslator('en')

// stubGlobal 的恢复：每个用例后都解绑，避免污染后续用例的 crypto 环境
afterEach(() => {
  vi.unstubAllGlobals()
})
const defaultOptions = { words: '4', separator: '-', capitalize: false }
/** 确定性随机源：恒返回 0 → 恒取 WORDS[0] */
const randZero = () => 0

describe('passphrase-gen / WORDS 词表', () => {
  it('规模 200+、全小写、长度 3–8、无重复', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(200)
    expect(new Set(WORDS).size).toBe(WORDS.length)
    for (const word of WORDS) expect(word).toMatch(/^[a-z]{3,8}$/)
  })
})

describe('passphrase-gen / secureRandom', () => {
  it('返回 [0, 1) 的浮点数', () => {
    for (let i = 0; i < 10; i++) {
      const v = secureRandom(t)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('crypto 完全缺失时抛双语错误', () => {
    vi.stubGlobal('crypto', undefined)
    expect(() => secureRandom(t)).toThrow(/crypto\.getRandomValues/)
    expect(() => secureRandom(enT)).toThrow(/crypto\.getRandomValues/)
  })

  it('crypto 存在但无 getRandomValues 时抛错', () => {
    vi.stubGlobal('crypto', {})
    expect(() => secureRandom(t)).toThrow(/crypto\.getRandomValues/)
  })
})

describe('passphrase-gen / parseWordCount', () => {
  it('合法单词数', () => {
    expect(parseWordCount('4', t)).toBe(4)
    expect(parseWordCount(' 3 ', t)).toBe(3)
    expect(parseWordCount(String(MAX_WORDS), t)).toBe(MAX_WORDS)
  })

  it('非整数抛错', () => {
    expect(() => parseWordCount('abc', t)).toThrow(/单词数无效/)
    expect(() => parseWordCount('2.5', t)).toThrow(/单词数无效/)
    expect(() => parseWordCount('', t)).toThrow(/单词数无效/)
  })

  it('0 与超上限抛错', () => {
    expect(() => parseWordCount('0', t)).toThrow(/单词数无效/)
    expect(() => parseWordCount(String(MAX_WORDS + 1), t)).toThrow(/单词数无效/)
  })
})

describe('passphrase-gen / parseSeparator', () => {
  it('常规分隔符与空分隔符', () => {
    expect(parseSeparator('-', t)).toBe('-')
    expect(parseSeparator('', t)).toBe('')
    expect(parseSeparator('_', t)).toBe('_')
  })

  it('超长分隔符抛错', () => {
    expect(() => parseSeparator('x'.repeat(MAX_SEPARATOR_LENGTH + 1), t)).toThrow(/分隔符过长/)
  })
})

describe('passphrase-gen / capitalize', () => {
  it('首字母大写', () => {
    expect(capitalize('apple')).toBe('Apple')
  })
})

describe('passphrase-gen / generatePassphrase', () => {
  it('确定性随机源下可复现', () => {
    const expected = `${WORDS[0]}-${WORDS[0]}-${WORDS[0]}-${WORDS[0]}`
    expect(generatePassphrase(4, '-', false, t, randZero)).toBe(expected)
  })

  it('首字母大写选项', () => {
    expect(generatePassphrase(2, '-', true, t, randZero)).toBe('Abandon-Abandon')
  })

  it('空分隔符直接拼接', () => {
    expect(generatePassphrase(2, '', false, t, randZero)).toBe('abandonabandon')
  })

  it('默认随机源走 crypto（不传 rand 也能跑）', () => {
    const phrase = generatePassphrase(4, '-', false, t)
    expect(phrase.split('-')).toHaveLength(4)
  })
})

describe('passphrase-gen / transform', () => {
  it('空输入 → 空串（不进入错误态）', () => {
    expect(transform({ text: '' }, defaultOptions, t)).toBe('')
    expect(transform({ text: '   ' }, defaultOptions, t)).toBe('')
  })

  it('触发后生成指定单词数的短语', () => {
    const out = transform({ text: 'generate' }, defaultOptions, t, randZero)
    expect(out.split('-')).toHaveLength(4)
  })

  it('非法单词数进入错误态（抛错）', () => {
    expect(() => transform({ text: 'generate' }, { ...defaultOptions, words: '0' }, t)).toThrow(
      /单词数无效/,
    )
    expect(() => transform({ text: 'generate' }, { ...defaultOptions, words: '99' }, t)).toThrow(
      /单词数无效/,
    )
  })

  it('超长分隔符进入错误态（抛错）', () => {
    expect(() =>
      transform(
        { text: 'generate' },
        { ...defaultOptions, separator: 'x'.repeat(MAX_SEPARATOR_LENGTH + 1) },
        t,
      ),
    ).toThrow(/分隔符过长/)
  })

  it('默认随机源可用（不传 rand）', () => {
    const out = transform({ text: 'generate' }, defaultOptions, t)
    expect(out.split('-')).toHaveLength(4)
  })
})
