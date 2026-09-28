/**
 * physics-formula（#822）工具函数：物理公式库与代入计算。
 * 纯函数，无 DOM / 网络依赖。
 */

export interface FormulaVar {
  readonly symbol: string
  readonly name: string
  readonly unit: string
}

export interface PhysicsFormula {
  readonly id: string
  readonly name: string
  readonly nameEn: string
  readonly expr: string
  readonly vars: readonly FormulaVar[]
  readonly calc: (vars: Record<string, number>) => number
}

export const FORMULAS: readonly PhysicsFormula[] = [
  {
    id: 'speed',
    name: '速度',
    nameEn: 'Speed',
    expr: 'v = s / t',
    vars: [
      { symbol: 's', name: '路程', unit: 'm' },
      { symbol: 't', name: '时间', unit: 's' },
    ],
    calc: (v) => v.s / v.t,
  },
  {
    id: 'acceleration',
    name: '加速度',
    nameEn: 'Acceleration',
    expr: 'a = (v - v0) / t',
    vars: [
      { symbol: 'v', name: '末速度', unit: 'm/s' },
      { symbol: 'v0', name: '初速度', unit: 'm/s' },
      { symbol: 't', name: '时间', unit: 's' },
    ],
    calc: (v) => (v.v - v.v0) / v.t,
  },
  {
    id: 'force',
    name: '牛顿第二定律',
    nameEn: "Newton's Second Law",
    expr: 'F = m · a',
    vars: [
      { symbol: 'm', name: '质量', unit: 'kg' },
      { symbol: 'a', name: '加速度', unit: 'm/s²' },
    ],
    calc: (v) => v.m * v.a,
  },
  {
    id: 'weight',
    name: '重力',
    nameEn: 'Weight',
    expr: 'G = m · g（g 取 9.8）',
    vars: [{ symbol: 'm', name: '质量', unit: 'kg' }],
    calc: (v) => v.m * 9.8,
  },
  {
    id: 'work',
    name: '功',
    nameEn: 'Work',
    expr: 'W = F · s',
    vars: [
      { symbol: 'F', name: '力', unit: 'N' },
      { symbol: 's', name: '位移', unit: 'm' },
    ],
    calc: (v) => v.F * v.s,
  },
  {
    id: 'power',
    name: '功率',
    nameEn: 'Power',
    expr: 'P = W / t',
    vars: [
      { symbol: 'W', name: '功', unit: 'J' },
      { symbol: 't', name: '时间', unit: 's' },
    ],
    calc: (v) => v.W / v.t,
  },
  {
    id: 'kinetic',
    name: '动能',
    nameEn: 'Kinetic Energy',
    expr: 'Ek = ½ · m · v²',
    vars: [
      { symbol: 'm', name: '质量', unit: 'kg' },
      { symbol: 'v', name: '速度', unit: 'm/s' },
    ],
    calc: (v) => 0.5 * v.m * v.v * v.v,
  },
  {
    id: 'potential',
    name: '重力势能',
    nameEn: 'Gravitational Potential Energy',
    expr: 'Ep = m · g · h（g 取 9.8）',
    vars: [
      { symbol: 'm', name: '质量', unit: 'kg' },
      { symbol: 'h', name: '高度', unit: 'm' },
    ],
    calc: (v) => v.m * 9.8 * v.h,
  },
  {
    id: 'density',
    name: '密度',
    nameEn: 'Density',
    expr: 'ρ = m / V',
    vars: [
      { symbol: 'm', name: '质量', unit: 'kg' },
      { symbol: 'V', name: '体积', unit: 'm³' },
    ],
    calc: (v) => v.m / v.V,
  },
  {
    id: 'pressure',
    name: '压强',
    nameEn: 'Pressure',
    expr: 'p = F / S',
    vars: [
      { symbol: 'F', name: '压力', unit: 'N' },
      { symbol: 'S', name: '受力面积', unit: 'm²' },
    ],
    calc: (v) => v.F / v.S,
  },
  {
    id: 'ohm',
    name: '欧姆定律',
    nameEn: "Ohm's Law",
    expr: 'I = U / R',
    vars: [
      { symbol: 'U', name: '电压', unit: 'V' },
      { symbol: 'R', name: '电阻', unit: 'Ω' },
    ],
    calc: (v) => v.U / v.R,
  },
  {
    id: 'electric-power',
    name: '电功率',
    nameEn: 'Electric Power',
    expr: 'P = U · I',
    vars: [
      { symbol: 'U', name: '电压', unit: 'V' },
      { symbol: 'I', name: '电流', unit: 'A' },
    ],
    calc: (v) => v.U * v.I,
  },
  {
    id: 'joule-heat',
    name: '焦耳定律',
    nameEn: "Joule's Law",
    expr: 'Q = I² · R · t',
    vars: [
      { symbol: 'I', name: '电流', unit: 'A' },
      { symbol: 'R', name: '电阻', unit: 'Ω' },
      { symbol: 't', name: '时间', unit: 's' },
    ],
    calc: (v) => v.I * v.I * v.R * v.t,
  },
  {
    id: 'heat',
    name: '热量计算',
    nameEn: 'Specific Heat',
    expr: 'Q = c · m · ΔT',
    vars: [
      { symbol: 'c', name: '比热容', unit: 'J/(kg·℃)' },
      { symbol: 'm', name: '质量', unit: 'kg' },
      { symbol: 'dT', name: '温度变化', unit: '℃' },
    ],
    calc: (v) => v.c * v.m * v.dT,
  },
  {
    id: 'wave',
    name: '波速',
    nameEn: 'Wave Speed',
    expr: 'v = λ · f',
    vars: [
      { symbol: 'λ', name: '波长', unit: 'm' },
      { symbol: 'f', name: '频率', unit: 'Hz' },
    ],
    calc: (v) => v['λ'] * v.f,
  },
]

/** 按 id 取公式；未知即抛中文错误 */
export function getFormula(id: string): PhysicsFormula {
  const formula = FORMULAS.find((f) => f.id === id)
  if (!formula) throw new Error(`未知公式「${id}」`)
  return formula
}

/** 代入计算：缺变量或非有限数值即抛中文错误 */
export function calcFormula(id: string, vars: Record<string, number>): number {
  const formula = getFormula(id)
  for (const v of formula.vars) {
    const value = vars[v.symbol]
    if (value === undefined) throw new Error(`缺少变量 ${v.symbol}（${v.name}，单位 ${v.unit}）`)
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`变量 ${v.symbol} 须为有限数值`)
    }
  }
  return formula.calc(vars)
}

/** 公式的可读摘要（含变量说明） */
export function describeFormula(formula: PhysicsFormula): string {
  const varLines = formula.vars.map((v) => `  ${v.symbol}：${v.name}（${v.unit}）`).join('\n')
  return `${formula.name}（${formula.nameEn}）\n${formula.expr}\n变量：\n${varLines}`
}

/** 公式目录 */
export function listFormulas(): string {
  return FORMULAS.map((f) => `${f.id}：${f.name}（${f.expr}）`).join('\n')
}
