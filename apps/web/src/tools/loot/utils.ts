/**
 * loot —— 全局编号 #803
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 随机掉落：按权重抽取掉落项（支持数量区间 min/max），
 * 可注入随机源做确定性测试，mulberry32 供模拟统计使用。
 * 纯前端，无任何运行时依赖。
 */

export interface LootItem {
  id: string
  /** 权重（≥ 0，至少一项 > 0） */
  weight: number
  /** 掉落数量下限（默认 1） */
  min?: number
  /** 掉落数量上限（默认 = min） */
  max?: number
}

export interface LootResult {
  id: string
  count: number
}

/** 随机源，可注入以实现确定性测试 */
export type Rng = () => number

function requireFinite(n: unknown, name: string): asserts n is number {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${name} 必须是有限数字`)
}

function requireNonEmptyString(s: unknown, name: string): asserts s is string {
  if (typeof s !== 'string' || s.trim() === '') throw new Error(`${name} 不能为空`)
}

/** 可复现的随机数发生器 */
export function mulberry32(seed: number): Rng {
  if (!Number.isInteger(seed)) throw new Error('seed 必须为整数')
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 校验掉落表，返回权重和 */
function validateTable(table: LootItem[]): number {
  if (!Array.isArray(table) || table.length === 0) throw new Error('掉落表不能为空')
  let total = 0
  for (const item of table) {
    requireNonEmptyString(item.id, '掉落项 id')
    requireFinite(item.weight, `权重(${item.id})`)
    if (item.weight < 0) throw new Error(`权重(${item.id}) 不能为负数`)
    total += item.weight
    if (item.min !== undefined || item.max !== undefined) {
      const lo = item.min ?? 1
      const hi = item.max ?? lo
      if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
        throw new Error(`数量(${item.id}) 必须为整数`)
      }
      if (lo < 1) throw new Error(`数量下限(${item.id}) 必须 ≥ 1`)
      if (hi < lo) throw new Error(`数量上限(${item.id}) 不能小于下限`)
    }
  }
  if (total <= 0) throw new Error('掉落表权重之和必须大于 0')
  return total
}

/** 单次权重抽取 */
export function rollLoot(table: LootItem[], rng: Rng = Math.random): LootResult {
  const total = validateTable(table)
  const r = rng() * total
  let acc = 0
  for (const item of table) {
    acc += item.weight
    if (r < acc) {
      const lo = item.min ?? 1
      const hi = item.max ?? lo
      const count = lo === hi ? lo : lo + Math.floor(rng() * (hi - lo + 1))
      return { id: item.id, count }
    }
  }
  // 兜底：随机源返回 1 等极端情况，r == total 时落到最后一项
  const last = table[table.length - 1]
  return { id: last.id, count: last.min ?? 1 }
}

/** 模拟 times 次抽取，统计各掉落项出现次数与概率 */
export function simulateLoot(
  table: LootItem[],
  times: number,
  seed: number,
): Array<{ id: string; count: number; rate: number }> {
  if (!Number.isInteger(times) || times < 1) throw new Error('模拟次数 times 必须为正整数')
  const rng = mulberry32(seed)
  const counts = new Map<string, number>()
  for (let i = 0; i < times; i++) {
    const { id } = rollLoot(table, rng)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return table.map((item) => {
    const c = counts.get(item.id) ?? 0
    return { id: item.id, count: c, rate: c / times }
  })
}

/** 格式化模拟结果为文本 */
export function formatLootStats(rows: Array<{ id: string; count: number; rate: number }>): string {
  return rows
    .map((r) => `${r.id}\t${r.count} 次\t${(r.rate * 100).toFixed(2)}%`)
    .join('\n')
}
