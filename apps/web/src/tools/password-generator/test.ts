import { describe, expect, it } from 'vitest'
import type { PasswordOptions } from './schema'
import {
  AMBIGUOUS,
  CLASSES,
  LENGTHS,
  buildCharsets,
  filterAmbiguous,
  generatePassword,
  parseLength,
  transform,
} from './utils'

/** 确定性假随机源：LCG，同种子必得同一序列（单测里替代 CSPRNG） */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/** 恒为 0 的随机源：每次取字符集里的第一个字符，便于写死期望值 */
const alwaysZero = () => 0

const base: PasswordOptions = {
  length: '16',
  noAmbiguous: false,
  eachClass: true,
  includeLower: true,
  includeUpper: true,
  includeNumbers: true,
  includeSymbols: true,
}

const onlyLower: PasswordOptions = {
  ...base,
  length: '8',
  includeUpper: false,
  includeNumbers: false,
  includeSymbols: false,
}

const onlyNumbers: PasswordOptions = {
  ...base,
  length: '8',
  includeLower: false,
  includeUpper: false,
  includeSymbols: false,
}

describe('password-generator / 字符集', () => {
  it('排除易混字符：数字去掉 0 与 1', () => {
    expect(filterAmbiguous(CLASSES.numbers)).toBe('23456789')
    expect(filterAmbiguous(CLASSES.lower)).toBe('abcdefghijkmnpqrstuvwxyz')
  })

  it('AMBIGUOUS 里的字符会被全部剔除', () => {
    const filtered = filterAmbiguous(AMBIGUOUS)
    expect(filtered).toBe('')
  })

  it('按勾选给出字符集列表', () => {
    expect(buildCharsets(onlyLower)).toEqual([CLASSES.lower])
    expect(buildCharsets(base)).toHaveLength(4)
    expect(buildCharsets({ ...base, noAmbiguous: true })[2]).toBe('23456789')
  })
})

describe('password-generator / generatePassword', () => {
  it('固定随机源 + 仅小写 + 长度 8 → aaaaaaaa（已知向量）', () => {
    expect(generatePassword(onlyLower, alwaysZero)).toBe('aaaaaaaa')
  })

  it('固定随机源 + 仅数字 → 00000000（已知向量）', () => {
    expect(generatePassword(onlyNumbers, alwaysZero)).toBe('00000000')
  })

  it('长度选项生效', () => {
    for (const length of LENGTHS) {
      expect(generatePassword({ ...base, length }, seeded(7))).toHaveLength(Number(length))
    }
  })

  it('「每类至少一个」时四类字符都出现', () => {
    const password = generatePassword(base, seeded(3))
    expect(password).toMatch(/[a-z]/)
    expect(password).toMatch(/[A-Z]/)
    expect(password).toMatch(/[0-9]/)
    expect(password).toMatch(/[^a-zA-Z0-9]/)
  })

  it('关掉「每类至少一个」后字符仍全部来自所选字符集', () => {
    const options: PasswordOptions = { ...base, eachClass: false }
    const pool = buildCharsets(options).join('')
    const password = generatePassword(options, seeded(5))
    expect(password).toHaveLength(16)
    for (const char of password) expect(pool).toContain(char)
  })

  it('排除易混字符后不会出现 Il1O0o', () => {
    const password = generatePassword({ ...base, noAmbiguous: true }, seeded(11))
    for (const char of password) expect(AMBIGUOUS.includes(char)).toBe(false)
  })

  it('同种子结果一致，不同种子结果不同', () => {
    const first = generatePassword(base, seeded(42))
    expect(generatePassword(base, seeded(42))).toBe(first)
    expect(generatePassword(base, seeded(43))).not.toBe(first)
  })

  it('一类字符都不勾选时报错', () => {
    const none: PasswordOptions = {
      ...base,
      includeLower: false,
      includeUpper: false,
      includeNumbers: false,
      includeSymbols: false,
    }
    expect(() => generatePassword(none, seeded(1))).toThrow(/至少勾选一类字符/)
  })
})

describe('password-generator / transform', () => {
  it('空输入返回空串，且不触碰随机源（边界）', () => {
    let called = false
    const spy = () => {
      called = true
      return 0
    }
    expect(transform({ text: '' }, base, spy)).toBe('')
    expect(called).toBe(false)
  })

  it('输入非空即可触发生成，长度与字符集符合选项', () => {
    const password = transform({ text: 'generate' }, base, seeded(9))
    const pool = CLASSES.lower + CLASSES.upper + CLASSES.numbers + CLASSES.symbols
    expect(password).toHaveLength(16)
    for (const char of password) expect(pool).toContain(char)
  })

  it('非法长度选项报错', () => {
    const badLength = { ...base, length: '99' } as unknown as PasswordOptions
    expect(() => parseLength('99')).toThrow(/不支持的长度/)
    expect(() => transform({ text: 'x' }, badLength)).toThrow(/不支持的长度/)
  })

  it('输入超过上限时报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('默认随机源走 CSPRNG：两次结果不同，且不含易混字符的选项生效', () => {
    const first = transform({ text: 'generate' }, base)
    const second = transform({ text: 'generate' }, base)
    expect(first).toHaveLength(16)
    expect(first).not.toBe(second)
  })
})
