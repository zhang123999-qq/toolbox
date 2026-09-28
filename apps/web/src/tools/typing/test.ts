/**
 * typing（#831）utils 单测：WPM、准确率与逐字对比。
 */
import { describe, expect, it } from 'vitest'
import { analyzeTyping, calcAccuracy, calcWpm, formatErrors } from './utils'

describe('calcWpm', () => {
  it('300 字符 60 秒 = 60 WPM', () => {
    expect(calcWpm(300, 60)).toBe(60)
  })
  it('保留 1 位小数', () => {
    expect(calcWpm(100, 45)).toBe(26.7)
  })
  it('0 字符为 0 WPM', () => {
    expect(calcWpm(0, 30)).toBe(0)
  })
  it('负字符数抛中文错误', () => {
    expect(() => calcWpm(-1, 30)).toThrow('字符数必须为非负数')
  })
  it('非有限字符数抛中文错误', () => {
    expect(() => calcWpm(NaN, 30)).toThrow('字符数必须为非负数')
  })
  it('用时 ≤0 抛中文错误', () => {
    expect(() => calcWpm(100, 0)).toThrow('用时必须大于 0 秒')
    expect(() => calcWpm(100, -5)).toThrow('用时必须大于 0 秒')
    expect(() => calcWpm(100, NaN)).toThrow('用时必须大于 0 秒')
  })
})

describe('calcAccuracy', () => {
  it('100 字符错 5 个 = 95%', () => {
    expect(calcAccuracy(100, 5)).toBe(95)
  })
  it('全对 100%，全错 0%', () => {
    expect(calcAccuracy(10, 0)).toBe(100)
    expect(calcAccuracy(10, 10)).toBe(0)
  })
  it('保留 1 位小数', () => {
    expect(calcAccuracy(3, 1)).toBe(66.7)
  })
  it('非法总数抛中文错误', () => {
    expect(() => calcAccuracy(0, 0)).toThrow('总字符数必须为正整数')
    expect(() => calcAccuracy(2.5, 0)).toThrow('总字符数必须为正整数')
  })
  it('非法错误数抛中文错误', () => {
    expect(() => calcAccuracy(10, -1)).toThrow('错误数必须为 0 到总数之间的整数')
    expect(() => calcAccuracy(10, 11)).toThrow('错误数必须为 0 到总数之间的整数')
    expect(() => calcAccuracy(10, 1.5)).toThrow('错误数必须为 0 到总数之间的整数')
  })
})

describe('analyzeTyping', () => {
  it('全对：准确率 100%', () => {
    const r = analyzeTyping('hello', 'hello', 60)
    expect(r.accuracy).toBe(100)
    expect(r.errorCount).toBe(0)
    expect(r.correctChars).toBe(5)
    expect(r.totalChars).toBe(5)
    expect(r.wpm).toBe(1)
  })
  it('错字被定位', () => {
    const r = analyzeTyping('hello', 'hallo', 60)
    expect(r.errorCount).toBe(1)
    expect(r.errors[0]).toEqual({ pos: 1, expected: 'e', got: 'a' })
    expect(r.accuracy).toBe(80)
  })
  it('缺字记为错误', () => {
    const r = analyzeTyping('hello', 'hell', 60)
    expect(r.errorCount).toBe(1)
    expect(r.errors[0]).toEqual({ pos: 4, expected: 'o', got: '' })
    expect(r.accuracy).toBe(80)
  })
  it('多字记为错误', () => {
    const r = analyzeTyping('hi', 'hix', 60)
    expect(r.errorCount).toBe(1)
    expect(r.errors[0]).toEqual({ pos: 2, expected: '', got: 'x' })
    expect(r.accuracy).toBe(100)
  })
  it('空目标文本抛中文错误', () => {
    expect(() => analyzeTyping('', 'a', 60)).toThrow('目标文本不能为空')
  })
})

describe('formatErrors', () => {
  it('无错误', () => {
    expect(formatErrors([])).toBe('无错误')
  })
  it('缺字与多余字的展示', () => {
    const text = formatErrors([
      { pos: 4, expected: 'o', got: '' },
      { pos: 2, expected: '', got: 'x' },
    ])
    expect(text).toContain('#5 应为「o」，实为（缺字）')
    expect(text).toContain('#3 应为（多余），实为「x」')
  })
  it('超过 10 项截断并提示总数', () => {
    const errors = Array.from({ length: 12 }, (_, i) => ({
      pos: i,
      expected: 'a',
      got: 'b',
    }))
    const text = formatErrors(errors)
    expect(text).toContain('共 12 处错误')
    expect(text.split('\n')).toHaveLength(11)
  })
})
