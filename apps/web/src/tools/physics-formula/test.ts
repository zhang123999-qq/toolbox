/**
 * physics-formula（#822）utils 单测：公式代入计算。
 */
import { describe, expect, it } from 'vitest'
import { calcFormula, describeFormula, FORMULAS, getFormula, listFormulas } from './utils'

describe('FORMULAS', () => {
  it('不少于 12 条', () => {
    expect(FORMULAS.length).toBeGreaterThanOrEqual(12)
  })
  it('id 唯一', () => {
    const ids = FORMULAS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('calcFormula', () => {
  it('速度', () => {
    expect(calcFormula('speed', { s: 100, t: 20 })).toBe(5)
  })
  it('加速度', () => {
    expect(calcFormula('acceleration', { v: 30, v0: 10, t: 4 })).toBe(5)
  })
  it('牛顿第二定律', () => {
    expect(calcFormula('force', { m: 2, a: 3 })).toBe(6)
  })
  it('重力', () => {
    expect(calcFormula('weight', { m: 10 })).toBeCloseTo(98)
  })
  it('功', () => {
    expect(calcFormula('work', { F: 10, s: 5 })).toBe(50)
  })
  it('功率', () => {
    expect(calcFormula('power', { W: 100, t: 4 })).toBe(25)
  })
  it('动能', () => {
    expect(calcFormula('kinetic', { m: 2, v: 3 })).toBe(9)
  })
  it('重力势能', () => {
    expect(calcFormula('potential', { m: 5, h: 2 })).toBeCloseTo(98)
  })
  it('密度', () => {
    expect(calcFormula('density', { m: 10, V: 2 })).toBe(5)
  })
  it('压强', () => {
    expect(calcFormula('pressure', { F: 100, S: 4 })).toBe(25)
  })
  it('欧姆定律', () => {
    expect(calcFormula('ohm', { U: 12, R: 4 })).toBe(3)
  })
  it('电功率', () => {
    expect(calcFormula('electric-power', { U: 220, I: 2 })).toBe(440)
  })
  it('焦耳定律', () => {
    expect(calcFormula('joule-heat', { I: 2, R: 5, t: 10 })).toBe(200)
  })
  it('热量计算', () => {
    expect(calcFormula('heat', { c: 4200, m: 1, dT: 10 })).toBe(42000)
  })
  it('波速', () => {
    expect(calcFormula('wave', { λ: 2, f: 440 })).toBe(880)
  })
  it('未知公式抛错', () => {
    expect(() => calcFormula('nope', {})).toThrow('未知公式「nope」')
  })
  it('缺变量抛错', () => {
    expect(() => calcFormula('speed', { s: 100 })).toThrow('缺少变量 t（时间，单位 s）')
  })
  it('非有限数值抛错', () => {
    expect(() => calcFormula('speed', { s: 100, t: Number.NaN })).toThrow('变量 t 须为有限数值')
    expect(() => calcFormula('speed', { s: 100, t: Number.POSITIVE_INFINITY })).toThrow(
      '变量 t 须为有限数值',
    )
  })
  it('非数字类型抛错', () => {
    expect(() => calcFormula('speed', { s: 100, t: 'x' as unknown as number })).toThrow(
      '变量 t 须为有限数值',
    )
  })
})

describe('getFormula', () => {
  it('取到公式', () => {
    expect(getFormula('ohm').name).toBe('欧姆定律')
  })
  it('未知抛错', () => {
    expect(() => getFormula('xyz')).toThrow('未知公式「xyz」')
  })
})

describe('describeFormula', () => {
  it('含变量说明', () => {
    const text = describeFormula(getFormula('force'))
    expect(text).toContain('牛顿第二定律')
    expect(text).toContain('F = m · a')
    expect(text).toContain('m：质量（kg）')
  })
})

describe('listFormulas', () => {
  it('列出全部公式', () => {
    const text = listFormulas()
    expect(text).toContain('speed：速度')
    expect(text.split('\n')).toHaveLength(FORMULAS.length)
  })
})
