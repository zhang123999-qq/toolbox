/**
 * exp-curve —— 全局编号 #805
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 经验曲线：计算升到下一级所需经验
 * linear 线性（base + growth × (level-1)）、
 * exponential 指数（base × growth^(level-1)），
 * 生成 1..maxLevel 经验表（含累计），并支持由累计经验反查等级。
 * 纯前端，无任何运行时依赖。
 */

export type ExpMode = 'linear' | 'exponential'

export interface ExpCurveInput {
  /** 1 级升 2 级所需经验（> 0） */
  base: number
  /** 线性：每级增量；指数：每级成长系数 */
  growth: number
  mode: ExpMode
}

export interface ExpTableRow {
  level: number
  /** 从 level 升到 level+1 所需经验 */
  need: number
  /** 从 1 级累计到 level 所需总经验 */
  total: number
}

function requireFinite(n: unknown, name: string): asserts n is number {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${name} 必须是有限数字`)
}

function requireLevel(level: unknown): asserts level is number {
  if (!Number.isInteger(level) || (level as number) < 1) throw new Error('等级 level 必须为正整数')
}

/** 计算从 level 升到 level+1 所需经验 */
export function expForLevel(level: number, input: ExpCurveInput): number {
  requireLevel(level)
  requireFinite(input.base, '基础经验 base')
  if (input.base <= 0) throw new Error('基础经验 base 必须为正数')
  switch (input.mode) {
    case 'linear': {
      requireFinite(input.growth, '每级增量 growth')
      if (input.growth < 0) throw new Error('线性模式的 growth 不能为负数')
      return input.base + input.growth * (level - 1)
    }
    case 'exponential': {
      requireFinite(input.growth, '成长系数 growth')
      if (input.growth <= 0) throw new Error('指数模式的 growth 必须为正数')
      return input.base * Math.pow(input.growth, level - 1)
    }
    default:
      throw new Error('经验模式非法，应为 linear / exponential 之一')
  }
}

/** 生成 1..maxLevel 的经验表 */
export function buildExpTable(input: ExpCurveInput, maxLevel: number): ExpTableRow[] {
  if (!Number.isInteger(maxLevel) || maxLevel < 1) throw new Error('maxLevel 必须为正整数')
  const rows: ExpTableRow[] = []
  let total = 0
  for (let level = 1; level <= maxLevel; level++) {
    const need = expForLevel(level, input)
    total += need
    rows.push({ level, need, total })
  }
  return rows
}

/** 由累计经验反查当前等级（不超过 maxLevel） */
export function levelForTotalExp(input: ExpCurveInput, totalExp: number, maxLevel: number): number {
  requireFinite(totalExp, '累计经验 totalExp')
  if (totalExp < 0) throw new Error('累计经验不能为负数')
  const table = buildExpTable(input, maxLevel)
  let level = 1
  for (const row of table) {
    if (totalExp >= row.total) level = row.level + 1
    else break
  }
  return Math.min(level, maxLevel)
}

/** 格式化经验表为文本 */
export function formatExpTable(rows: ExpTableRow[]): string {
  return rows
    .map((r) => `Lv.${r.level}\t升级需 ${Math.round(r.need)}\t累计 ${Math.round(r.total)}`)
    .join('\n')
}
