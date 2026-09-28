/**
 * math-formula（#824）工具函数：数学公式库与代入计算。
 * 纯函数，无 DOM / 网络依赖。数学域，与 physics-formula（物理）差异化。
 */

export type FormulaCategory = '代数' | '几何' | '三角'

export interface FormulaVar {
  key: string
  label: string
  labelEn: string
}

export interface MathFormula {
  id: string
  name: string
  nameEn: string
  category: FormulaCategory
  /** 公式表达式（展示用） */
  expr: string
  vars: FormulaVar[]
  calc: (v: Record<string, number>) => number
}

function req(v: Record<string, number>, key: string, label: string): number {
  const x = v[key]
  if (x === undefined || Number.isNaN(x)) throw new Error(`缺少变量：${label}（${key}）`)
  return x
}

function nonNegative(x: number, label: string): number {
  if (x < 0) throw new Error(`${label}不能为负数`)
  return x
}

export const FORMULAS: MathFormula[] = [
  {
    id: 'quadratic-discriminant',
    name: '一元二次方程判别式',
    nameEn: 'Quadratic discriminant',
    category: '代数',
    expr: 'Δ = b² - 4ac',
    vars: [
      { key: 'a', label: '二次项系数 a', labelEn: 'a' },
      { key: 'b', label: '一次项系数 b', labelEn: 'b' },
      { key: 'c', label: '常数项 c', labelEn: 'c' },
    ],
    calc: (v) => {
      const a = req(v, 'a', '二次项系数 a')
      const b = req(v, 'b', '一次项系数 b')
      const c = req(v, 'c', '常数项 c')
      return b * b - 4 * a * c
    },
  },
  {
    id: 'arithmetic-sum',
    name: '等差数列求和',
    nameEn: 'Arithmetic series sum',
    category: '代数',
    expr: 'Sₙ = n(a₁ + aₙ) / 2',
    vars: [
      { key: 'n', label: '项数 n', labelEn: 'n' },
      { key: 'a1', label: '首项 a₁', labelEn: 'a1' },
      { key: 'an', label: '末项 aₙ', labelEn: 'an' },
    ],
    calc: (v) => {
      const n = req(v, 'n', '项数 n')
      const a1 = req(v, 'a1', '首项 a₁')
      const an = req(v, 'an', '末项 aₙ')
      return (n * (a1 + an)) / 2
    },
  },
  {
    id: 'geometric-sum',
    name: '等比数列求和',
    nameEn: 'Geometric series sum',
    category: '代数',
    expr: 'Sₙ = a₁(1 - qⁿ) / (1 - q)',
    vars: [
      { key: 'a1', label: '首项 a₁', labelEn: 'a1' },
      { key: 'q', label: '公比 q', labelEn: 'q' },
      { key: 'n', label: '项数 n', labelEn: 'n' },
    ],
    calc: (v) => {
      const a1 = req(v, 'a1', '首项 a₁')
      const q = req(v, 'q', '公比 q')
      const n = req(v, 'n', '项数 n')
      if (q === 1) throw new Error('公比 q 不能为 1')
      return (a1 * (1 - Math.pow(q, n))) / (1 - q)
    },
  },
  {
    id: 'compound-interest',
    name: '复利终值',
    nameEn: 'Compound interest',
    category: '代数',
    expr: 'A = P(1 + r)ⁿ',
    vars: [
      { key: 'P', label: '本金 P', labelEn: 'P' },
      { key: 'r', label: '利率 r', labelEn: 'r' },
      { key: 'n', label: '期数 n', labelEn: 'n' },
    ],
    calc: (v) => {
      const P = req(v, 'P', '本金 P')
      const r = req(v, 'r', '利率 r')
      const n = req(v, 'n', '期数 n')
      return P * Math.pow(1 + r, n)
    },
  },
  {
    id: 'pythagorean',
    name: '勾股定理',
    nameEn: 'Pythagorean theorem',
    category: '几何',
    expr: 'c = √(a² + b²)',
    vars: [
      { key: 'a', label: '直角边 a', labelEn: 'a' },
      { key: 'b', label: '直角边 b', labelEn: 'b' },
    ],
    calc: (v) => {
      const a = req(v, 'a', '直角边 a')
      const b = req(v, 'b', '直角边 b')
      return Math.sqrt(a * a + b * b)
    },
  },
  {
    id: 'circle-area',
    name: '圆面积',
    nameEn: 'Circle area',
    category: '几何',
    expr: 'S = πr²',
    vars: [{ key: 'r', label: '半径 r', labelEn: 'r' }],
    calc: (v) => {
      const r = nonNegative(req(v, 'r', '半径 r'), '半径 r')
      return Math.PI * r * r
    },
  },
  {
    id: 'sphere-volume',
    name: '球体积',
    nameEn: 'Sphere volume',
    category: '几何',
    expr: 'V = 4/3 πr³',
    vars: [{ key: 'r', label: '半径 r', labelEn: 'r' }],
    calc: (v) => {
      const r = nonNegative(req(v, 'r', '半径 r'), '半径 r')
      return (4 / 3) * Math.PI * r * r * r
    },
  },
  {
    id: 'cylinder-volume',
    name: '圆柱体积',
    nameEn: 'Cylinder volume',
    category: '几何',
    expr: 'V = πr²h',
    vars: [
      { key: 'r', label: '底面半径 r', labelEn: 'r' },
      { key: 'h', label: '高 h', labelEn: 'h' },
    ],
    calc: (v) => {
      const r = nonNegative(req(v, 'r', '底面半径 r'), '底面半径 r')
      const h = nonNegative(req(v, 'h', '高 h'), '高 h')
      return Math.PI * r * r * h
    },
  },
  {
    id: 'cone-volume',
    name: '圆锥体积',
    nameEn: 'Cone volume',
    category: '几何',
    expr: 'V = πr²h / 3',
    vars: [
      { key: 'r', label: '底面半径 r', labelEn: 'r' },
      { key: 'h', label: '高 h', labelEn: 'h' },
    ],
    calc: (v) => {
      const r = nonNegative(req(v, 'r', '底面半径 r'), '底面半径 r')
      const h = nonNegative(req(v, 'h', '高 h'), '高 h')
      return (Math.PI * r * r * h) / 3
    },
  },
  {
    id: 'triangle-area',
    name: '三角形面积',
    nameEn: 'Triangle area',
    category: '几何',
    expr: 'S = bh / 2',
    vars: [
      { key: 'b', label: '底边 b', labelEn: 'b' },
      { key: 'h', label: '高 h', labelEn: 'h' },
    ],
    calc: (v) => {
      const b = nonNegative(req(v, 'b', '底边 b'), '底边 b')
      const h = nonNegative(req(v, 'h', '高 h'), '高 h')
      return (b * h) / 2
    },
  },
  {
    id: 'trapezoid-area',
    name: '梯形面积',
    nameEn: 'Trapezoid area',
    category: '几何',
    expr: 'S = (a + b)h / 2',
    vars: [
      { key: 'a', label: '上底 a', labelEn: 'a' },
      { key: 'b', label: '下底 b', labelEn: 'b' },
      { key: 'h', label: '高 h', labelEn: 'h' },
    ],
    calc: (v) => {
      const a = nonNegative(req(v, 'a', '上底 a'), '上底 a')
      const b = nonNegative(req(v, 'b', '下底 b'), '下底 b')
      const h = nonNegative(req(v, 'h', '高 h'), '高 h')
      return ((a + b) * h) / 2
    },
  },
  {
    id: 'heron',
    name: '海伦公式',
    nameEn: "Heron's formula",
    category: '几何',
    expr: 'S = √[s(s-a)(s-b)(s-c)]，s = (a+b+c)/2',
    vars: [
      { key: 'a', label: '边 a', labelEn: 'a' },
      { key: 'b', label: '边 b', labelEn: 'b' },
      { key: 'c', label: '边 c', labelEn: 'c' },
    ],
    calc: (v) => {
      const a = req(v, 'a', '边 a')
      const b = req(v, 'b', '边 b')
      const c = req(v, 'c', '边 c')
      if (a <= 0 || b <= 0 || c <= 0) throw new Error('边长必须为正数')
      if (a + b <= c || a + c <= b || b + c <= a) {
        throw new Error('不满足三角形不等式')
      }
      const s = (a + b + c) / 2
      return Math.sqrt(s * (s - a) * (s - b) * (s - c))
    },
  },
  {
    id: 'distance-2d',
    name: '两点间距离',
    nameEn: 'Distance between two points',
    category: '几何',
    expr: 'd = √[(x₂-x₁)² + (y₂-y₁)²]',
    vars: [
      { key: 'x1', label: 'x₁', labelEn: 'x1' },
      { key: 'y1', label: 'y₁', labelEn: 'y1' },
      { key: 'x2', label: 'x₂', labelEn: 'x2' },
      { key: 'y2', label: 'y₂', labelEn: 'y2' },
    ],
    calc: (v) => {
      const dx = req(v, 'x2', 'x₂') - req(v, 'x1', 'x₁')
      const dy = req(v, 'y2', 'y₂') - req(v, 'y1', 'y₁')
      return Math.sqrt(dx * dx + dy * dy)
    },
  },
  {
    id: 'slope',
    name: '直线斜率',
    nameEn: 'Slope of a line',
    category: '三角',
    expr: 'k = (y₂ - y₁) / (x₂ - x₁)',
    vars: [
      { key: 'x1', label: 'x₁', labelEn: 'x1' },
      { key: 'y1', label: 'y₁', labelEn: 'y1' },
      { key: 'x2', label: 'x₂', labelEn: 'x2' },
      { key: 'y2', label: 'y₂', labelEn: 'y2' },
    ],
    calc: (v) => {
      const x1 = req(v, 'x1', 'x₁')
      const x2 = req(v, 'x2', 'x₂')
      if (x1 === x2) throw new Error('垂直直线的斜率不存在')
      return (req(v, 'y2', 'y₂') - req(v, 'y1', 'y₁')) / (x2 - x1)
    },
  },
]

/** 按 id 取公式，未知 id 抛中文错误 */
export function getFormula(id: string): MathFormula {
  const f = FORMULAS.find((x) => x.id === id)
  if (!f) throw new Error(`未知公式：${id}`)
  return f
}

/** 代入变量计算公式值 */
export function calcFormula(id: string, vars: Record<string, number>): number {
  return getFormula(id).calc(vars)
}

export function listFormulas(): MathFormula[] {
  return FORMULAS
}

export function formulasByCategory(category: FormulaCategory): MathFormula[] {
  return FORMULAS.filter((f) => f.category === category)
}

/**
 * 解析 "a=3 b=4.5" 风格的变量赋值文本为键值表。
 * 空文本返回空对象；格式非法抛中文错误。
 */
export function parseVars(text: string): Record<string, number> {
  const out: Record<string, number> = {}
  const s = text.trim()
  if (s === '') return out
  for (const part of s.split(/[\s,;]+/)) {
    if (part === '') continue
    const eq = part.indexOf('=')
    if (eq === -1) throw new Error(`变量格式应为 key=value：${part}`)
    const key = part.slice(0, eq).trim()
    const raw = part.slice(eq + 1).trim()
    if (key === '' || raw === '') throw new Error(`变量格式应为 key=value：${part}`)
    const value = Number(raw)
    if (Number.isNaN(value)) throw new Error(`变量 ${key} 的值不是数字：${raw}`)
    out[key] = value
  }
  return out
}
