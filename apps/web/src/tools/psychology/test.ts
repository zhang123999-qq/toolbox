/**
 * psychology（#839）utils 单测：自评量表计分。
 */
import { describe, expect, it } from 'vitest'
import { SCALES, formatScore, getScale, scoreScale } from './utils'

describe('SCALES', () => {
  it('含压力 10 题与焦虑 7 题', () => {
    expect(SCALES).toHaveLength(2)
    expect(getScale('stress').questions).toHaveLength(10)
    expect(getScale('anxiety').questions).toHaveLength(7)
  })
  it('每题 5 级选项', () => {
    for (const s of SCALES) {
      expect(s.options).toHaveLength(5)
    }
  })
})

describe('getScale', () => {
  it('返回对应量表', () => {
    expect(getScale('anxiety').name).toContain('焦虑')
  })
  it('未知 id 抛中文错误', () => {
    expect(() => getScale('nope')).toThrow('未知的量表：nope')
  })
})

describe('scoreScale', () => {
  it('全 0 分 → 正常', () => {
    const r = scoreScale('stress', new Array(10).fill(0))
    expect(r).toEqual({ total: 0, max: 40, level: '正常' })
  })
  it('比例 25% 边界为正常', () => {
    // 10 分 / 40 = 0.25
    const r = scoreScale('stress', [2, 2, 2, 2, 2, 0, 0, 0, 0, 0])
    expect(r.level).toBe('正常')
  })
  it('26%–50% 为轻度', () => {
    const r = scoreScale('stress', [2, 2, 2, 2, 2, 1, 0, 0, 0, 0])
    expect(r.total).toBe(11)
    expect(r.level).toBe('轻度')
  })
  it('50% 边界为轻度，超过为中度', () => {
    const edge = scoreScale('stress', [4, 4, 4, 4, 4, 0, 0, 0, 0, 0])
    expect(edge.total).toBe(20)
    expect(edge.level).toBe('轻度')
    const mid = scoreScale('stress', [4, 4, 4, 4, 4, 1, 0, 0, 0, 0])
    expect(mid.level).toBe('中度')
  })
  it('75% 边界为中度，超过为重度', () => {
    const edge = scoreScale('anxiety', [4, 4, 4, 4, 4, 1, 0])
    expect(edge.total).toBe(21)
    expect(edge.level).toBe('中度')
    const high = scoreScale('anxiety', new Array(7).fill(4))
    expect(high.level).toBe('重度')
  })
  it('题数不符抛中文错误', () => {
    expect(() => scoreScale('stress', [0, 0])).toThrow('请回答全部 10 道题')
  })
  it('非整数答案抛错', () => {
    expect(() => scoreScale('stress', [1.5, ...new Array(9).fill(0)])).toThrow('第 1 题答案无效')
  })
  it('负数答案抛错', () => {
    expect(() => scoreScale('stress', [-1, ...new Array(9).fill(0)])).toThrow('第 1 题答案无效')
  })
  it('超范围答案抛错', () => {
    const a = new Array(10).fill(0)
    a[9] = 5
    expect(() => scoreScale('stress', a)).toThrow('第 10 题答案无效')
  })
})

describe('formatScore', () => {
  it('含量表名、总分与非诊断声明', () => {
    const s = formatScore(getScale('anxiety'), { total: 5, max: 28, level: '正常' })
    expect(s).toContain('焦虑自评')
    expect(s).toContain('5 / 28')
    expect(s).toContain('非医学诊断')
  })
})
