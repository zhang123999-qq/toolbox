/**
 * game-value —— 全局编号 #802
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 游戏数值成长公式计算：
 * linear 线性（base + perLevel × (level-1)）、
 * exponential 指数（base × perLevel^(level-1)）、
 * piecewise 分段（拐点数组线性插值），
 * 并可生成 1..maxLevel 的成长表。
 * 纯前端，无任何运行时依赖。
 */

export type GrowthMode = 'linear' | 'exponential' | 'piecewise'

export interface Breakpoint {
  level: number
  value: number
}

export interface GrowthInput {
  /** 1 级基础值 */
  base: number
  /** 线性：每级增量；指数：每级成长系数 */
  perLevel: number
  mode: GrowthMode
  /** piecewise 模式的拐点数组 */
  breakpoints?: Breakpoint[]
}

function requireFinite(n: unknown, name: string): asserts n is number {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${name} 必须是有限数字`)
}

function requireLevel(level: unknown): asserts level is number {
  if (!Number.isInteger(level) || (level as number) < 1) throw new Error('等级 level 必须为正整数')
}

function normalizeBreakpoints(bps: Breakpoint[] | undefined): Breakpoint[] {
  if (!Array.isArray(bps) || bps.length === 0) {
    throw new Error('piecewise 模式需要非空拐点数组 breakpoints')
  }
  const sorted = [...bps].sort((a, b) => a.level - b.level)
  for (const bp of sorted) {
    if (!Number.isInteger(bp.level) || bp.level < 1) throw new Error('拐点 level 必须为正整数')
    requireFinite(bp.value, '拐点 value')
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].level === sorted[i - 1].level) throw new Error('拐点 level 不能重复')
  }
  return sorted
}

function interpolate(bps: Breakpoint[], level: number): number {
  if (level <= bps[0].level) return bps[0].value
  const last = bps[bps.length - 1]
  if (level >= last.level) return last.value
  let idx = 1
  while (idx < bps.length && level > bps[idx].level) idx++
  const a = bps[idx - 1]
  const b = bps[idx]
  const t = (level - a.level) / (b.level - a.level)
  return a.value + t * (b.value - a.value)
}

/** 计算指定等级的属性值 */
export function growthValue(level: number, input: GrowthInput): number {
  requireLevel(level)
  requireFinite(input.base, '基础值 base')
  switch (input.mode) {
    case 'linear': {
      requireFinite(input.perLevel, '每级增量 perLevel')
      return input.base + input.perLevel * (level - 1)
    }
    case 'exponential': {
      requireFinite(input.perLevel, '成长系数 perLevel')
      if (input.perLevel <= 0) throw new Error('指数模式的 perLevel 必须为正数')
      return input.base * Math.pow(input.perLevel, level - 1)
    }
    case 'piecewise': {
      return interpolate(normalizeBreakpoints(input.breakpoints), level)
    }
    default:
      throw new Error('成长模式非法，应为 linear / exponential / piecewise 之一')
  }
}

/** 生成 1..maxLevel 的成长表 */
export function buildGrowthTable(
  input: GrowthInput,
  maxLevel: number,
): Array<{ level: number; value: number }> {
  if (!Number.isInteger(maxLevel) || maxLevel < 1) throw new Error('maxLevel 必须为正整数')
  const rows: Array<{ level: number; value: number }> = []
  for (let level = 1; level <= maxLevel; level++) {
    rows.push({ level, value: growthValue(level, input) })
  }
  return rows
}

/** 格式化成长表为文本 */
export function formatGrowthTable(rows: Array<{ level: number; value: number }>): string {
  return rows.map((r) => `Lv.${r.level}\t${Number(r.value.toFixed(4))}`).join('\n')
}
