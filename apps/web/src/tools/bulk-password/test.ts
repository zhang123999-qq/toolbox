import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  buildCharset,
  CLASSES,
  generatePasswords,
  MAX_COUNT,
  parseCount,
  parseLength,
  secureRandom,
  transform,
} from './utils'

const t = createTranslator('zh')
const enT = createTranslator('en')

// stubGlobal 的恢复：每个用例后都解绑，避免污染后续用例的 crypto 环境
afterEach(() => {
  vi.unstubAllGlobals()
})
const allCharsets = {
  includeLower: true,
  includeUpper: true,
  includeNumbers: true,
  includeSymbols: true,
}
const defaultOptions = { count: '10', length: '16', ...allCharsets }
/** 确定性随机源：恒返回 0 → 恒取字符集首字符 */
const randZero = () => 0

describe('bulk-password / secureRandom', () => {
  it('返回 [0, 1) 的浮点数', () => {
    const v = secureRandom(t)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
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

describe('bulk-password / parseCount', () => {
  it('合法数量', () => {
    expect(parseCount('10', t)).toBe(10)
    expect(parseCount(' 5 ', t)).toBe(5)
    expect(parseCount(String(MAX_COUNT), t)).toBe(MAX_COUNT)
  })

  it('非整数抛错', () => {
    expect(() => parseCount('abc', t)).toThrow(/数量无效/)
    expect(() => parseCount('2.5', t)).toThrow(/数量无效/)
    expect(() => parseCount('', t)).toThrow(/数量无效/)
  })

  it('0 / 负数意图与超上限抛错', () => {
    expect(() => parseCount('0', t)).toThrow(/数量无效/)
    expect(() => parseCount('-5', t)).toThrow(/数量无效/)
    expect(() => parseCount(String(MAX_COUNT + 1), t)).toThrow(/数量无效/)
  })
})

describe('bulk-password / parseLength', () => {
  it('合法长度', () => {
    expect(parseLength('16', t)).toBe(16)
    expect(parseLength('8', t)).toBe(8)
  })

  it('非法长度抛错', () => {
    expect(() => parseLength('99', t)).toThrow(/不支持的长度/)
    expect(() => parseLength('abc', t)).toThrow(/不支持的长度/)
  })
})

describe('bulk-password / buildCharset', () => {
  it('全选则四类字符集拼接', () => {
    expect(buildCharset({ ...allCharsets }, t)).toBe(
      CLASSES.lower + CLASSES.upper + CLASSES.numbers + CLASSES.symbols,
    )
  })

  it('单选小写 / 单选数字', () => {
    expect(
      buildCharset(
        { includeLower: true, includeUpper: false, includeNumbers: false, includeSymbols: false },
        t,
      ),
    ).toBe(CLASSES.lower)
    expect(
      buildCharset(
        { includeLower: false, includeUpper: false, includeNumbers: true, includeSymbols: false },
        t,
      ),
    ).toBe(CLASSES.numbers)
  })

  it('单选大写 / 单选符号', () => {
    expect(
      buildCharset(
        { includeLower: false, includeUpper: true, includeNumbers: false, includeSymbols: false },
        t,
      ),
    ).toBe(CLASSES.upper)
    expect(
      buildCharset(
        { includeLower: false, includeUpper: false, includeNumbers: false, includeSymbols: true },
        t,
      ),
    ).toBe(CLASSES.symbols)
  })

  it('一个都不选抛错', () => {
    expect(() =>
      buildCharset(
        {
          includeLower: false,
          includeUpper: false,
          includeNumbers: false,
          includeSymbols: false,
        },
        t,
      ),
    ).toThrow(/至少选择一类字符/)
  })
})

describe('bulk-password / generatePasswords', () => {
  it('确定性随机源下可复现', () => {
    expect(generatePasswords(3, 4, 'ab', t, randZero)).toEqual(['aaaa', 'aaaa', 'aaaa'])
  })

  it('条数与长度正确', () => {
    const out = generatePasswords(5, 12, CLASSES.lower, t, randZero)
    expect(out).toHaveLength(5)
    for (const password of out) expect(password).toHaveLength(12)
  })

  it('默认随机源走 crypto（不传 rand 也能跑）', () => {
    const out = generatePasswords(2, 8, CLASSES.lower, t)
    expect(out).toHaveLength(2)
    for (const password of out) expect(password).toMatch(/^[a-z]{8}$/)
  })
})

describe('bulk-password / transform', () => {
  it('空输入 → 空串（不进入错误态）', () => {
    expect(transform({ text: '' }, defaultOptions, t)).toBe('')
  })

  it('触发后按条数与长度生成', () => {
    const out = transform(
      { text: 'generate' },
      { ...defaultOptions, count: '3', length: '8' },
      t,
      randZero,
    )
    const lines = out.split('\n')
    expect(lines).toHaveLength(3)
    for (const line of lines) expect(line).toHaveLength(8)
  })

  it('非法条数 / 长度进入错误态（抛错）', () => {
    expect(() => transform({ text: 'generate' }, { ...defaultOptions, count: '0' }, t)).toThrow(
      /数量无效/,
    )
    expect(() => transform({ text: 'generate' }, { ...defaultOptions, count: '10001' }, t)).toThrow(
      /数量无效/,
    )
    expect(() => transform({ text: 'generate' }, { ...defaultOptions, length: '7' }, t)).toThrow(
      /不支持的长度/,
    )
  })

  it('未选字符集进入错误态（抛错）', () => {
    expect(() =>
      transform(
        { text: 'generate' },
        {
          ...defaultOptions,
          includeLower: false,
          includeUpper: false,
          includeNumbers: false,
          includeSymbols: false,
        },
        t,
      ),
    ).toThrow(/至少选择一类字符/)
  })

  it('默认随机源可用（不传 rand）', () => {
    const out = transform({ text: 'generate' }, { ...defaultOptions, count: '2' }, t)
    expect(out.split('\n')).toHaveLength(2)
  })
})
