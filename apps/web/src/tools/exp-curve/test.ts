/**
 * exp-curve（#805）utils 单测：经验曲线。
 */
import { describe, expect, it } from 'vitest'
import { buildExpTable, expForLevel, formatExpTable, levelForTotalExp, type ExpCurveInput } from './utils'

describe('expForLevel · linear', () => {
  const input: ExpCurveInput = { base: 100, growth: 50, mode: 'linear' }
  it('1 级需 100', () => {
    expect(expForLevel(1, input)).toBe(100)
  })
  it('4 级需 250', () => {
    expect(expForLevel(4, input)).toBe(250)
  })
  it('growth 为负报错', () => {
    expect(() => expForLevel(2, { ...input, growth: -1 })).toThrow('不能为负数')
  })
})

describe('expForLevel · exponential', () => {
  const input: ExpCurveInput = { base: 100, growth: 1.5, mode: 'exponential' }
  it('3 级需 225', () => {
    expect(expForLevel(3, input)).toBeCloseTo(225, 10)
  })
  it('growth 非正报错', () => {
    expect(() => expForLevel(2, { ...input, growth: 0 })).toThrow('正数')
  })
})

describe('expForLevel · 通用校验', () => {
  const input: ExpCurveInput = { base: 100, growth: 50, mode: 'linear' }
  it('等级非法报错', () => {
    expect(() => expForLevel(0, input)).toThrow('正整数')
    expect(() => expForLevel(2.5, input)).toThrow('正整数')
  })
  it('base 非法报错', () => {
    expect(() => expForLevel(1, { ...input, base: 0 })).toThrow('正数')
    expect(() => expForLevel(1, { ...input, base: Number.NaN })).toThrow('有限数字')
  })
  it('非法模式报错', () => {
    expect(() => expForLevel(1, { ...input, mode: 'quad' as never })).toThrow('经验模式非法')
  })
})

describe('buildExpTable', () => {
  it('累计值正确', () => {
    const rows = buildExpTable({ base: 100, growth: 0, mode: 'linear' }, 3)
    expect(rows).toEqual([
      { level: 1, need: 100, total: 100 },
      { level: 2, need: 100, total: 200 },
      { level: 3, need: 100, total: 300 },
    ])
  })
  it('maxLevel 非法报错', () => {
    expect(() => buildExpTable({ base: 100, growth: 0, mode: 'linear' }, 0)).toThrow('正整数')
  })
})

describe('levelForTotalExp', () => {
  const input: ExpCurveInput = { base: 100, growth: 0, mode: 'linear' }
  it('0 经验为 1 级', () => {
    expect(levelForTotalExp(input, 0, 10)).toBe(1)
  })
  it('250 经验为 3 级', () => {
    expect(levelForTotalExp(input, 250, 10)).toBe(3)
  })
  it('恰好整级', () => {
    expect(levelForTotalExp(input, 200, 10)).toBe(3)
  })
  it('超表封顶', () => {
    expect(levelForTotalExp(input, 99999, 10)).toBe(10)
  })
  it('累计经验非法报错', () => {
    expect(() => levelForTotalExp(input, -1, 10)).toThrow('不能为负数')
    expect(() => levelForTotalExp(input, Number.NaN, 10)).toThrow('有限数字')
  })
})

describe('formatExpTable', () => {
  it('格式化输出', () => {
    const s = formatExpTable([{ level: 1, need: 100, total: 100 }])
    expect(s).toBe('Lv.1\t升级需 100\t累计 100')
  })
})
