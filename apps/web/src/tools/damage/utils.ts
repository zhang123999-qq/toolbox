/**
 * damage —— 全局编号 #804
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 伤害计算：防御减伤公式 atk² / (atk + def)，
 * 暴击判定（critRate / critMult），伤害浮动 variance，
 * 最终伤害至少为 1。随机源可注入以实现确定性测试。
 * 纯前端，无任何运行时依赖。
 */

export interface DamageInput {
  /** 攻击力（> 0） */
  atk: number
  /** 防御力（≥ 0） */
  def: number
  /** 暴击率 [0, 1] */
  critRate: number
  /** 暴击倍率（≥ 1） */
  critMult: number
  /** 伤害浮动 [0, 1)，默认 0 */
  variance?: number
  /** 随机源，默认 Math.random */
  rng?: () => number
}

export interface DamageResult {
  /** 最终伤害（≥ 1，取整） */
  damage: number
  /** 是否暴击 */
  isCrit: boolean
  /** 减伤前基础值 atk²/(atk+def) */
  base: number
}

function requireFinite(n: unknown, name: string): asserts n is number {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${name} 必须是有限数字`)
}

/** 计算一次伤害 */
export function calcDamage(input: DamageInput): DamageResult {
  requireFinite(input.atk, '攻击力 atk')
  requireFinite(input.def, '防御力 def')
  requireFinite(input.critRate, '暴击率 critRate')
  requireFinite(input.critMult, '暴击倍率 critMult')
  if (input.atk <= 0) throw new Error('攻击力 atk 必须为正数')
  if (input.def < 0) throw new Error('防御力 def 不能为负数')
  if (input.critRate < 0 || input.critRate > 1) {
    throw new Error('暴击率 critRate 必须在 [0, 1] 之间')
  }
  if (input.critMult < 1) throw new Error('暴击倍率 critMult 必须 ≥ 1')
  const variance = input.variance ?? 0
  requireFinite(variance, '伤害浮动 variance')
  if (variance < 0 || variance >= 1) throw new Error('伤害浮动 variance 必须在 [0, 1) 之间')
  const rng = input.rng ?? Math.random

  const base = (input.atk * input.atk) / (input.atk + input.def)
  const isCrit = rng() < input.critRate
  let d = base * (isCrit ? input.critMult : 1)
  if (variance > 0) {
    d *= 1 - variance + rng() * 2 * variance
  }
  const damage = Math.max(1, Math.round(d))
  return { damage, isCrit, base }
}

/** 格式化伤害结果为文本 */
export function formatDamageResult(r: DamageResult): string {
  const lines = [`最终伤害：${r.damage}${r.isCrit ? '（暴击！）' : ''}`]
  lines.push(`基础值：${Number(r.base.toFixed(2))}`)
  return lines.join('\n')
}
