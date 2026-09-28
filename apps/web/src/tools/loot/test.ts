/**
 * loot（#803）utils 单测：随机掉落权重抽取。
 */
import { describe, expect, it } from 'vitest'
import { formatLootStats, mulberry32, rollLoot, simulateLoot, type LootItem } from './utils'

const TABLE: LootItem[] = [
  { id: 'gold', weight: 70, min: 10, max: 20 },
  { id: 'sword', weight: 20 },
  { id: 'gem', weight: 10, min: 1, max: 1 },
]

describe('mulberry32', () => {
  it('相同种子序列相同', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('不同种子序列不同', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })
  it('输出在 [0, 1) 内', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('seed 非整数报错', () => {
    expect(() => mulberry32(1.5)).toThrow('整数')
  })
})

describe('rollLoot', () => {
  it('权重抽取：固定随机源命中第一项', () => {
    const r = rollLoot(TABLE, () => 0)
    expect(r.id).toBe('gold')
    expect(r.count).toBe(10) // rng=0 → 数量下限
  })
  it('权重抽取：命中第二项', () => {
    // r = 0.8 × 100 = 80，落在 sword 区间 (70, 90]
    const r = rollLoot(TABLE, () => 0.8)
    expect(r.id).toBe('sword')
    expect(r.count).toBe(1) // 无 min/max → 1
  })
  it('权重抽取：命中最后一项', () => {
    const r = rollLoot(TABLE, () => 0.95)
    expect(r.id).toBe('gem')
    expect(r.count).toBe(1) // min == max → 固定值
  })
  it('随机源返回 1 走兜底分支', () => {
    const r = rollLoot(TABLE, () => 1)
    expect(r.id).toBe('gem')
  })
  it('兜底分支：末项无 min 时数量为 1', () => {
    const r = rollLoot([{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }], () => 1)
    expect(r).toEqual({ id: 'b', count: 1 })
  })
  it('只给 min 时 max 取 min', () => {
    const r = rollLoot([{ id: 'a', weight: 1, min: 3 }], () => 0)
    expect(r).toEqual({ id: 'a', count: 3 })
  })
  it('只给 max 时 min 取 1', () => {
    const r = rollLoot([{ id: 'a', weight: 1, max: 5 }], () => 0)
    expect(r).toEqual({ id: 'a', count: 1 })
  })
  it('掉落表为空报错', () => {
    expect(() => rollLoot([])).toThrow('不能为空')
  })
  it('掉落表非数组报错', () => {
    expect(() => rollLoot('x' as unknown as LootItem[])).toThrow('不能为空')
  })
  it('id 为空报错', () => {
    expect(() => rollLoot([{ id: '', weight: 1 }])).toThrow('不能为空')
  })
  it('权重非法报错', () => {
    expect(() => rollLoot([{ id: 'a', weight: Number.NaN }])).toThrow('有限数字')
    expect(() => rollLoot([{ id: 'a', weight: -1 }])).toThrow('不能为负数')
  })
  it('权重和为 0 报错', () => {
    expect(() => rollLoot([{ id: 'a', weight: 0 }])).toThrow('大于 0')
  })
  it('数量非整数报错', () => {
    expect(() => rollLoot([{ id: 'a', weight: 1, min: 1.5 }])).toThrow('整数')
  })
  it('数量下限 < 1 报错', () => {
    expect(() => rollLoot([{ id: 'a', weight: 1, min: 0 }])).toThrow('≥ 1')
  })
  it('上限小于下限报错', () => {
    expect(() => rollLoot([{ id: 'a', weight: 1, min: 5, max: 3 }])).toThrow('不能小于下限')
  })
})

describe('simulateLoot', () => {
  it('模拟次数总和一致', () => {
    const rows = simulateLoot(TABLE, 1000, 123)
    expect(rows.reduce((s, r) => s + r.count, 0)).toBe(1000)
  })
  it('相同种子结果相同', () => {
    expect(simulateLoot(TABLE, 500, 9)).toEqual(simulateLoot(TABLE, 500, 9))
  })
  it('概率大致符合权重', () => {
    const rows = simulateLoot(TABLE, 20000, 1)
    const gold = rows.find((r) => r.id === 'gold')!
    expect(gold.rate).toBeGreaterThan(0.65)
    expect(gold.rate).toBeLessThan(0.75)
  })
  it('次数非法报错', () => {
    expect(() => simulateLoot(TABLE, 0, 1)).toThrow('正整数')
  })
  it('权重为 0 的项模拟次数为 0', () => {
    const rows = simulateLoot(
      [
        { id: 'a', weight: 1 },
        { id: 'b', weight: 0 },
      ],
      100,
      3,
    )
    const b = rows.find((r) => r.id === 'b')!
    expect(b.count).toBe(0)
    expect(b.rate).toBe(0)
  })
})

describe('formatLootStats', () => {
  it('格式化输出', () => {
    const s = formatLootStats([{ id: 'gold', count: 700, rate: 0.7 }])
    expect(s).toContain('gold')
    expect(s).toContain('70.00%')
  })
})
