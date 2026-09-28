/**
 * game-value（#802）utils 单测：游戏数值成长公式。
 */
import { describe, expect, it } from 'vitest'
import { buildGrowthTable, formatGrowthTable, growthValue, type GrowthInput } from './utils'

describe('growthValue · linear', () => {
  const input: GrowthInput = { base: 100, perLevel: 10, mode: 'linear' }
  it('1 级为基础值', () => {
    expect(growthValue(1, input)).toBe(100)
  })
  it('5 级 = 100 + 10×4', () => {
    expect(growthValue(5, input)).toBe(140)
  })
  it('perLevel 非法报错', () => {
    expect(() => growthValue(2, { ...input, perLevel: Number.NaN })).toThrow('有限数字')
  })
})

describe('growthValue · exponential', () => {
  const input: GrowthInput = { base: 100, perLevel: 1.1, mode: 'exponential' }
  it('3 级 = 100 × 1.1²', () => {
    expect(growthValue(3, input)).toBeCloseTo(121, 10)
  })
  it('perLevel 非正报错', () => {
    expect(() => growthValue(2, { ...input, perLevel: 0 })).toThrow('正数')
  })
})

describe('growthValue · piecewise', () => {
  const input: GrowthInput = {
    base: 0,
    perLevel: 0,
    mode: 'piecewise',
    breakpoints: [
      { level: 10, value: 200 },
      { level: 1, value: 100 },
      { level: 5, value: 150 },
    ],
  }
  it('拐点处取值', () => {
    expect(growthValue(1, input)).toBe(100)
    expect(growthValue(5, input)).toBe(150)
    expect(growthValue(10, input)).toBe(200)
  })
  it('拐点间线性插值', () => {
    expect(growthValue(3, input)).toBe(125) // 100 + (150-100)×(3-1)/(5-1)
    expect(growthValue(7, input)).toBe(170) // 150 + (200-150)×(7-5)/(10-5)，跨过中间拐点
  })
  it('低于首拐点取首值', () => {
    expect(growthValue(1, { ...input, breakpoints: [{ level: 5, value: 50 }] })).toBe(50)
  })
  it('高于末拐点取末值', () => {
    expect(growthValue(99, input)).toBe(200)
  })
  it('缺少拐点数组报错', () => {
    expect(() => growthValue(2, { base: 0, perLevel: 0, mode: 'piecewise' })).toThrow('拐点数组')
    expect(() => growthValue(2, { base: 0, perLevel: 0, mode: 'piecewise', breakpoints: [] })).toThrow('拐点数组')
  })
  it('拐点 level 非法报错', () => {
    expect(() =>
      growthValue(2, { base: 0, perLevel: 0, mode: 'piecewise', breakpoints: [{ level: 0, value: 1 }] }),
    ).toThrow('正整数')
  })
  it('拐点 value 非法报错', () => {
    expect(() =>
      growthValue(2, { base: 0, perLevel: 0, mode: 'piecewise', breakpoints: [{ level: 1, value: Number.NaN }] }),
    ).toThrow('有限数字')
  })
  it('拐点 level 重复报错', () => {
    expect(() =>
      growthValue(2, {
        base: 0,
        perLevel: 0,
        mode: 'piecewise',
        breakpoints: [
          { level: 1, value: 1 },
          { level: 1, value: 2 },
        ],
      }),
    ).toThrow('不能重复')
  })
})

describe('growthValue · 通用校验', () => {
  const input: GrowthInput = { base: 100, perLevel: 10, mode: 'linear' }
  it('等级非法报错', () => {
    expect(() => growthValue(0, input)).toThrow('正整数')
    expect(() => growthValue(1.5, input)).toThrow('正整数')
  })
  it('base 非法报错', () => {
    expect(() => growthValue(1, { ...input, base: Number.NaN })).toThrow('有限数字')
  })
  it('非法模式报错', () => {
    expect(() => growthValue(1, { ...input, mode: 'cubic' as never })).toThrow('成长模式非法')
  })
})

describe('buildGrowthTable', () => {
  it('生成 1..N 表', () => {
    const rows = buildGrowthTable({ base: 10, perLevel: 5, mode: 'linear' }, 3)
    expect(rows).toEqual([
      { level: 1, value: 10 },
      { level: 2, value: 15 },
      { level: 3, value: 20 },
    ])
  })
  it('maxLevel 非法报错', () => {
    expect(() => buildGrowthTable({ base: 10, perLevel: 5, mode: 'linear' }, 0)).toThrow('正整数')
  })
})

describe('formatGrowthTable', () => {
  it('格式化输出', () => {
    const s = formatGrowthTable([{ level: 1, value: 10.12345 }])
    expect(s).toBe('Lv.1\t10.1235')
  })
})
