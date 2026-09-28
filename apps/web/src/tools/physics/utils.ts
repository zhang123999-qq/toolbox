/**
 * physics —— 全局编号 #791
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 游戏物理参数计算：
 * projectile 斜抛运动（射程/最大高度/飞行时间）；
 * fallTime 自由落体时间；frictionStop 摩擦滑行距离与时间；
 * elasticCollision 一维完全弹性碰撞；
 * jumpVelocity 由目标跳跃高度反推初速度。
 * 所有输入校验中文报错，默认重力加速度 g = 9.8 m/s²。
 * 无任何运行时依赖。
 */

export interface ProjectileInput {
  /** 初速度（m/s） */
  v0: number
  /** 发射角度（度，0-90） */
  angleDeg: number
  /** 重力加速度（m/s²），默认 9.8 */
  g?: number
}

export interface ProjectileResult {
  /** 射程（m） */
  range: number
  /** 最大高度（m） */
  maxHeight: number
  /** 飞行时间（s） */
  flightTime: number
}

function requireFinite(n: unknown, name: string): asserts n is number {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${name} 必须是有限数字`)
}

function requirePositive(n: number, name: string): void {
  if (n <= 0) throw new Error(`${name} 必须为正数`)
}

function gravity(g: number | undefined): number {
  const value = g ?? 9.8
  requireFinite(value, '重力加速度 g')
  requirePositive(value, '重力加速度 g')
  return value
}

/** 斜抛运动 */
export function projectile(input: ProjectileInput): ProjectileResult {
  requireFinite(input.v0, '初速度 v0')
  requireFinite(input.angleDeg, '发射角度')
  requirePositive(input.v0, '初速度 v0')
  if (input.angleDeg <= 0 || input.angleDeg >= 90) {
    throw new Error('发射角度必须在 (0, 90) 度之间')
  }
  const g = gravity(input.g)
  const rad = (input.angleDeg * Math.PI) / 180
  const vy = input.v0 * Math.sin(rad)
  const flightTime = (2 * vy) / g
  const range = input.v0 * Math.cos(rad) * flightTime
  const maxHeight = (vy * vy) / (2 * g)
  return { range, maxHeight, flightTime }
}

/** 自由落体时间（s） */
export function fallTime(h: number, g = 9.8): number {
  requireFinite(h, '高度 h')
  requirePositive(h, '高度 h')
  const gv = gravity(g)
  return Math.sqrt((2 * h) / gv)
}

/** 由目标跳跃高度反推所需初速度（m/s） */
export function jumpVelocity(h: number, g = 9.8): number {
  requireFinite(h, '跳跃高度 h')
  requirePositive(h, '跳跃高度 h')
  const gv = gravity(g)
  return Math.sqrt(2 * gv * h)
}

export interface FrictionInput {
  /** 初速度（m/s） */
  v0: number
  /** 动摩擦系数（0-1） */
  mu: number
  /** 重力加速度（m/s²），默认 9.8 */
  g?: number
}

/** 摩擦滑行：返回滑行距离（m）与停止时间（s） */
export function frictionStop(input: FrictionInput): { distance: number; time: number } {
  requireFinite(input.v0, '初速度 v0')
  requireFinite(input.mu, '摩擦系数 mu')
  requirePositive(input.v0, '初速度 v0')
  if (input.mu <= 0 || input.mu > 1) throw new Error('摩擦系数 mu 必须在 (0, 1] 之间')
  const g = gravity(input.g)
  const a = input.mu * g
  return { distance: (input.v0 * input.v0) / (2 * a), time: input.v0 / a }
}

export interface CollisionInput {
  m1: number
  v1: number
  m2: number
  v2: number
}

/** 一维完全弹性碰撞，返回碰撞后速度 */
export function elasticCollision(input: CollisionInput): { v1p: number; v2p: number } {
  requireFinite(input.m1, '质量 m1')
  requireFinite(input.m2, '质量 m2')
  requireFinite(input.v1, '速度 v1')
  requireFinite(input.v2, '速度 v2')
  requirePositive(input.m1, '质量 m1')
  requirePositive(input.m2, '质量 m2')
  const total = input.m1 + input.m2
  const v1p = ((input.m1 - input.m2) * input.v1 + 2 * input.m2 * input.v2) / total
  const v2p = ((input.m2 - input.m1) * input.v2 + 2 * input.m1 * input.v1) / total
  return { v1p, v2p }
}

/** 匀速圆周运动：向心加速度与周期 */
export function circularMotion(
  v: number,
  r: number,
): { centripetal: number; period: number } {
  requireFinite(v, '线速度 v')
  requireFinite(r, '半径 r')
  requirePositive(v, '线速度 v')
  requirePositive(r, '半径 r')
  return { centripetal: (v * v) / r, period: (2 * Math.PI * r) / v }
}

export function formatPhysicsResult(label: string, values: Record<string, number>, unit: string): string {
  const lines = [`${label}：`]
  for (const [k, v] of Object.entries(values)) {
    lines.push(`  ${k} = ${Number(v.toFixed(4))} ${unit}`)
  }
  return lines.join('\n')
}
