/**
 * damage（#804）utils 单测：伤害计算。
 */
import { describe, expect, it } from 'vitest'
import { calcDamage, formatDamageResult } from './utils'

describe('calcDamage', () => {
  it('无暴击无浮动', () => {
    // base = 100²/(100+50) = 66.67
    const r = calcDamage({ atk: 100, def: 50, critRate: 0, critMult: 2, rng: () => 0.99 })
    expect(r.isCrit).toBe(false)
    expect(r.base).toBeCloseTo(66.6667, 3)
    expect(r.damage).toBe(67)
  })
  it('暴击翻倍', () => {
    const r = calcDamage({ atk: 100, def: 50, critRate: 0.5, critMult: 2, rng: () => 0.1 })
    expect(r.isCrit).toBe(true)
    expect(r.damage).toBe(133) // 66.67 × 2 = 133.33
  })
  it('伤害浮动生效', () => {
    // rng 序列：暴击判定 0.99（不暴击），浮动 0 → 系数 1-0.2 = 0.8
    const seq = [0.99, 0]
    const r = calcDamage({ atk: 100, def: 0, critRate: 0.5, critMult: 2, variance: 0.2, rng: () => seq.shift()! })
    expect(r.damage).toBe(80) // 100 × 0.8
  })
  it('伤害至少为 1', () => {
    const r = calcDamage({ atk: 1, def: 1e9, critRate: 0, critMult: 2, rng: () => 0.5 })
    expect(r.damage).toBe(1)
  })
  it('默认随机源与浮动', () => {
    const r = calcDamage({ atk: 50, def: 10, critRate: 0.2, critMult: 1.5 })
    expect(r.damage).toBeGreaterThanOrEqual(1)
  })
  it('攻击力非法报错', () => {
    expect(() => calcDamage({ atk: 0, def: 0, critRate: 0, critMult: 2 })).toThrow('正数')
    expect(() => calcDamage({ atk: Number.NaN, def: 0, critRate: 0, critMult: 2 })).toThrow('有限数字')
  })
  it('防御力非法报错', () => {
    expect(() => calcDamage({ atk: 10, def: -1, critRate: 0, critMult: 2 })).toThrow('不能为负数')
  })
  it('暴击率非法报错', () => {
    expect(() => calcDamage({ atk: 10, def: 0, critRate: 1.5, critMult: 2 })).toThrow('[0, 1]')
    expect(() => calcDamage({ atk: 10, def: 0, critRate: Number.NaN, critMult: 2 })).toThrow('有限数字')
  })
  it('暴击倍率非法报错', () => {
    expect(() => calcDamage({ atk: 10, def: 0, critRate: 0, critMult: 0.9 })).toThrow('≥ 1')
  })
  it('伤害浮动非法报错', () => {
    expect(() => calcDamage({ atk: 10, def: 0, critRate: 0, critMult: 2, variance: -0.1 })).toThrow('[0, 1)')
    expect(() => calcDamage({ atk: 10, def: 0, critRate: 0, critMult: 2, variance: 1 })).toThrow('[0, 1)')
    expect(() => calcDamage({ atk: 10, def: 0, critRate: 0, critMult: 2, variance: Number.NaN })).toThrow('有限数字')
  })
})

describe('formatDamageResult', () => {
  it('暴击标注', () => {
    expect(formatDamageResult({ damage: 133, isCrit: true, base: 66.67 })).toContain('暴击')
  })
  it('非暴击无标注', () => {
    const s = formatDamageResult({ damage: 67, isCrit: false, base: 66.67 })
    expect(s).toContain('最终伤害：67')
    expect(s).not.toContain('暴击')
  })
})
