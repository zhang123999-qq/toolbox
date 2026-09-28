import { describe, expect, it } from 'vitest'
import type { RandomPasswordOptions } from './schema'
import {
  AMBIGUOUS,
  buildCharsets,
  CLASSES,
  filterAmbiguous,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
  parseLength,
  secureRandomIndex,
  transform,
} from './utils'

const base: RandomPasswordOptions = {
  length: '16',
  includeUpper: true,
  includeLower: true,
  includeNumbers: true,
  includeSymbols: true,
  noAmbiguous: false,
}

const onlyLower: RandomPasswordOptions = {
  ...base,
  length: '8',
  includeUpper: false,
  includeNumbers: false,
  includeSymbols: false,
}

describe('random-password / parseLength', () => {
  it('合法长度通过', () => {
    expect(parseLength('16')).toBe(16)
    expect(parseLength(' 32 ')).toBe(32)
    expect(parseLength(String(MIN_LENGTH))).toBe(MIN_LENGTH)
    expect(parseLength(String(MAX_LENGTH))).toBe(MAX_LENGTH)
  })

  it('非整数抛中文错', () => {
    expect(() => parseLength('abc')).toThrow(/密码长度必须是整数/)
    expect(() => parseLength('12.5')).toThrow(/密码长度必须是整数/)
    expect(() => parseLength('')).toThrow(/密码长度必须是整数/)
  })

  it('越界抛中文错', () => {
    expect(() => parseLength('7')).toThrow(/密码长度必须在/)
    expect(() => parseLength('129')).toThrow(/密码长度必须在/)
    expect(() => parseLength('0')).toThrow(/密码长度必须在/)
  })
})

describe('random-password / 字符集', () => {
  it('排除易混淆字符', () => {
    expect(filterAmbiguous(CLASSES.numbers)).not.toMatch(/[01]/)
    expect(filterAmbiguous(CLASSES.lower)).not.toContain('l')
    expect(filterAmbiguous(CLASSES.upper)).not.toContain('I')
    expect(filterAmbiguous(AMBIGUOUS)).toBe('')
  })

  it('按勾选给出字符类', () => {
    expect(buildCharsets(onlyLower)).toEqual([CLASSES.lower])
    expect(buildCharsets(base)).toHaveLength(4)
    expect(buildCharsets({ ...base, noAmbiguous: true })[2]).toBe('23456789')
  })
})

describe('random-password / secureRandomIndex', () => {
  it('落在 [0, max) 内', () => {
    for (let i = 0; i < 200; i++) {
      const v = secureRandomIndex(62)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(62)
    }
  })

  it('空字符集抛错', () => {
    expect(() => secureRandomIndex(0)).toThrow(/字符集不能为空/)
  })
})

describe('random-password / generatePassword', () => {
  it('长度正确', () => {
    for (const length of [8, 16, 32, 128]) {
      expect(generatePassword({ ...base, length: String(length) })).toHaveLength(length)
    }
  })

  it('字符全部来自所选字符集', () => {
    const pool = CLASSES.lower + CLASSES.upper + CLASSES.numbers + CLASSES.symbols
    for (let i = 0; i < 20; i++) {
      const pwd = generatePassword(base)
      for (const ch of pwd) expect(pool).toContain(ch)
    }
  })

  it('四类字符都出现（每类至少一个）', () => {
    for (let i = 0; i < 10; i++) {
      const pwd = generatePassword(base)
      expect(pwd).toMatch(/[a-z]/)
      expect(pwd).toMatch(/[A-Z]/)
      expect(pwd).toMatch(/[0-9]/)
      expect(pwd).toMatch(/[^a-zA-Z0-9]/)
    }
  })

  it('排除易混淆后不出现 Il1O0o', () => {
    const pwd = generatePassword({ ...base, noAmbiguous: true })
    for (const ch of pwd) expect(AMBIGUOUS.includes(ch)).toBe(false)
  })

  it('多次生成唯一性', () => {
    const set = new Set<string>()
    for (let i = 0; i < 100; i++) set.add(generatePassword(base))
    expect(set.size).toBe(100)
  })

  it('一类都不勾选抛错', () => {
    const none: RandomPasswordOptions = {
      ...base,
      includeLower: false,
      includeUpper: false,
      includeNumbers: false,
      includeSymbols: false,
    }
    expect(() => generatePassword(none)).toThrow(/至少勾选一类字符/)
  })

  it('长度小于字符类数抛错', () => {
    expect(() => generatePassword({ ...base, length: '3' })).toThrow(/密码长度必须在/)
  })
})

describe('random-password / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('非空输入触发生成，长度与字符集正确', () => {
    const pwd = transform({ text: 'generate' }, base)
    expect(pwd).toHaveLength(16)
    expect(pwd).toMatch(/[a-z]/)
    expect(pwd).toMatch(/[A-Z]/)
    expect(pwd).toMatch(/[0-9]/)
  })

  it('非法长度抛错', () => {
    expect(() => transform({ text: 'x' }, { ...base, length: '999' })).toThrow(/密码长度必须在/)
  })

  it('全部取消勾选抛错', () => {
    const none: RandomPasswordOptions = {
      ...base,
      includeLower: false,
      includeUpper: false,
      includeNumbers: false,
      includeSymbols: false,
    }
    expect(() => transform({ text: 'x' }, none)).toThrow(/至少勾选一类字符/)
  })
})
