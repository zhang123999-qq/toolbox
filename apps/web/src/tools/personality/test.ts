/**
 * personality（#838）utils 单测：MBTI 问卷计分。
 */
import { describe, expect, it } from 'vitest'
import {
  QUESTIONS,
  TYPE_DESCRIPTIONS,
  describeType,
  formatResult,
  scoreAnswers,
  type Answer,
} from './utils'

const allA = (): Record<string, Answer> =>
  Object.fromEntries(QUESTIONS.map((q) => [q.id, 'a'])) as Record<string, Answer>
const allB = (): Record<string, Answer> =>
  Object.fromEntries(QUESTIONS.map((q) => [q.id, 'b'])) as Record<string, Answer>

describe('QUESTIONS', () => {
  it('共 16 题，每维度 4 题', () => {
    expect(QUESTIONS).toHaveLength(16)
    for (const dim of ['EI', 'SN', 'TF', 'JP']) {
      expect(QUESTIONS.filter((q) => q.dim === dim)).toHaveLength(4)
    }
  })
})

describe('scoreAnswers', () => {
  it('全选 A → ESTJ', () => {
    const r = scoreAnswers(allA())
    expect(r.type).toBe('ESTJ')
    expect(r.dims).toEqual({ EI: 'E', SN: 'S', TF: 'T', JP: 'J' })
  })
  it('全选 B → INFP', () => {
    const r = scoreAnswers(allB())
    expect(r.type).toBe('INFP')
  })
  it('混合答案按多数计分', () => {
    const a = allA()
    a.q1 = 'b'
    a.q2 = 'b'
    a.q3 = 'b'
    const r = scoreAnswers(a)
    expect(r.dims.EI).toBe('I')
    expect(r.dims.SN).toBe('S')
  })
  it('平分时取前者（E）', () => {
    const a = allA()
    a.q1 = 'b'
    a.q2 = 'b'
    const r = scoreAnswers(a)
    expect(r.dims.EI).toBe('E')
  })
  it('未答完抛中文错误并提示剩余题数', () => {
    expect(() => scoreAnswers({})).toThrow('还有 16 道题未作答')
    const partial = allA()
    delete partial.q16
    expect(() => scoreAnswers(partial)).toThrow('还有 1 道题未作答')
  })
  it('非法答案抛中文错误', () => {
    const a = allA() as Record<string, string>
    a.q1 = 'c'
    expect(() => scoreAnswers(a as Record<string, Answer>)).toThrow('第 q1 题答案无效')
  })
})

describe('TYPE_DESCRIPTIONS', () => {
  it('16 型齐全', () => {
    expect(Object.keys(TYPE_DESCRIPTIONS)).toHaveLength(16)
  })
  it('每型有名称与描述', () => {
    for (const d of Object.values(TYPE_DESCRIPTIONS)) {
      expect(d.name.length).toBeGreaterThan(0)
      expect(d.desc.length).toBeGreaterThan(0)
    }
  })
})

describe('describeType', () => {
  it('ENFP 返回竞选者', () => {
    expect(describeType('ENFP').name).toBe('竞选者')
  })
  it('未知类型抛中文错误', () => {
    expect(() => describeType('XXXX')).toThrow('未知的人格类型：XXXX')
  })
})

describe('formatResult', () => {
  it('含类型、名称与维度', () => {
    const s = formatResult(scoreAnswers(allA()))
    expect(s).toContain('ESTJ')
    expect(s).toContain('总经理')
    expect(s).toContain('外向-内向')
  })
})
