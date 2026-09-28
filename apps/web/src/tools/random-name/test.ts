import { describe, expect, it } from 'vitest'
import {
  EN_FEMALE,
  EN_MALE,
  EN_SURNAMES,
  MAX_COUNT,
  makeName,
  parseCount,
  parseGender,
  parseLanguage,
  resolveGender,
  transform,
  ZH_FEMALE,
  ZH_MALE,
  ZH_SURNAMES,
} from './utils'

describe('random-name / 词库规模', () => {
  it('中文姓氏约 50 个', () => {
    expect(ZH_SURNAMES.length).toBeGreaterThanOrEqual(45)
  })
  it('中英文名各约 30 个', () => {
    expect(ZH_MALE.length).toBeGreaterThanOrEqual(28)
    expect(ZH_FEMALE.length).toBeGreaterThanOrEqual(28)
    expect(EN_MALE.length).toBeGreaterThanOrEqual(28)
    expect(EN_FEMALE.length).toBeGreaterThanOrEqual(28)
    expect(EN_SURNAMES.length).toBeGreaterThanOrEqual(28)
  })
})

describe('random-name / parse 选项', () => {
  it('默认值', () => {
    expect(parseCount('')).toBe(1)
    expect(parseGender('')).toBe('random')
    expect(parseLanguage('')).toBe('zh')
  })
  it('非法值抛中文错', () => {
    expect(() => parseCount('0')).toThrow(/数量必须为 1 到 50/)
    expect(() => parseGender('other')).toThrow(/不支持的性别/)
    expect(() => parseLanguage('jp')).toThrow(/不支持的语言/)
  })
  it('count 上限', () => {
    expect(parseCount(String(MAX_COUNT))).toBe(MAX_COUNT)
    expect(() => parseCount(String(MAX_COUNT + 1))).toThrow(/数量必须为 1 到 50/)
  })
})

describe('random-name / resolveGender', () => {
  it('固定性别不随机', () => {
    expect(resolveGender('male', () => 0.9)).toBe('male')
    expect(resolveGender('female', () => 0.1)).toBe('female')
  })
  it('random 随随机源切换', () => {
    expect(resolveGender('random', () => 0.1)).toBe('male')
    expect(resolveGender('random', () => 0.9)).toBe('female')
  })
})

describe('random-name / makeName', () => {
  it('中文名 = 姓 + 名', () => {
    for (let i = 0; i < 50; i++) {
      const name = makeName('random', 'zh')
      expect(ZH_SURNAMES).toContain(name[0])
      expect(name.length).toBeGreaterThanOrEqual(2)
    }
  })
  it('英文名为 Given + Surname', () => {
    for (let i = 0; i < 50; i++) {
      const name = makeName('random', 'en')
      expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
    }
  })
  it('male 固定取男名', () => {
    for (let i = 0; i < 50; i++) {
      const name = makeName('male', 'en')
      const given = name.split(' ')[0]
      expect(EN_MALE).toContain(given)
    }
  })
  it('female 固定取女名', () => {
    for (let i = 0; i < 50; i++) {
      const name = makeName('female', 'en')
      const given = name.split(' ')[0]
      expect(EN_FEMALE).toContain(given)
    }
  })
  it('中文 female 取女名词库', () => {
    for (let i = 0; i < 50; i++) {
      const name = makeName('female', 'zh')
      const given = name.slice(1)
      expect(ZH_FEMALE).toContain(given)
    }
  })
})

describe('random-name / transform', () => {
  it('默认输出 1 个中文名', () => {
    const out = transform({ text: '' }, {})
    expect(out.split('\n')).toHaveLength(1)
    expect(out.length).toBeGreaterThanOrEqual(2)
  })
  it('count=3 输出 3 行英文名', () => {
    const out = transform({ text: '' }, { count: '3', language: 'en' })
    const lines = out.split('\n')
    expect(lines).toHaveLength(3)
    for (const line of lines) expect(line).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })
  it('非法选项抛中文错', () => {
    expect(() => transform({ text: '' }, { count: '999' })).toThrow(/数量必须为 1 到 50/)
    expect(() => transform({ text: '' }, { gender: 'x' })).toThrow(/不支持的性别/)
  })
})
