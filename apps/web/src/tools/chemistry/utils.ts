/**
 * chemistry（#823）工具函数：化学式解析、方程式配平、摩尔质量。
 * 纯函数，无 DOM / 网络依赖。
 */

/** 常见元素原子量表（g/mol） */
export const ATOMIC_MASS: Readonly<Record<string, number>> = {
  H: 1.008,
  He: 4.0026,
  Li: 6.94,
  Be: 9.0122,
  B: 10.81,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  Ne: 20.18,
  Na: 22.99,
  Mg: 24.305,
  Al: 26.982,
  Si: 28.085,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  Ar: 39.948,
  K: 39.098,
  Ca: 40.078,
  Sc: 44.956,
  Ti: 47.867,
  V: 50.942,
  Cr: 51.996,
  Mn: 54.938,
  Fe: 55.845,
  Co: 58.933,
  Ni: 58.693,
  Cu: 63.546,
  Zn: 65.38,
  Ga: 69.723,
  Ge: 72.63,
  As: 74.922,
  Se: 78.971,
  Br: 79.904,
  Kr: 83.798,
  Rb: 85.468,
  Sr: 87.62,
  Ag: 107.87,
  Cd: 112.41,
  Sn: 118.71,
  I: 126.9,
  Ba: 137.33,
  Pt: 195.08,
  Au: 196.97,
  Hg: 200.59,
  Pb: 207.2,
}

/** 元素符号 → 原子个数的计数表 */
export type ElementCounts = Map<string, number>

function readDigits(s: string, i: number): [string, number] {
  let num = ''
  while (i < s.length && s[i] >= '0' && s[i] <= '9') {
    num += s[i]
    i += 1
  }
  return [num, i]
}

/**
 * 解析化学式（如 H2O、Ca(OH)2、C6H12O6）为元素计数表。
 * 支持括号嵌套；非法字符或括号不匹配时抛中文错误。
 */
export function parseFormula(formula: string): ElementCounts {
  const s = formula.replace(/\s+/g, '')
  if (s === '') throw new Error('化学式不能为空')
  const stack: ElementCounts[] = [new Map()]
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (ch === '(') {
      stack.push(new Map())
      i += 1
      continue
    }
    if (ch === ')') {
      i += 1
      const [num, next] = readDigits(s, i)
      i = next
      const mult = num === '' ? 1 : parseInt(num, 10)
      if (stack.length < 2) throw new Error(`括号不匹配：${formula}`)
      const top = stack.pop() as ElementCounts
      const parent = stack[stack.length - 1]
      top.forEach((count, sym) => {
        parent.set(sym, (parent.get(sym) ?? 0) + count * mult)
      })
      continue
    }
    const symMatch = /^[A-Z][a-z]?/.exec(s.slice(i))
    if (symMatch) {
      const sym = symMatch[0]
      i += sym.length
      const [num, next] = readDigits(s, i)
      i = next
      const count = num === '' ? 1 : parseInt(num, 10)
      const top = stack[stack.length - 1]
      top.set(sym, (top.get(sym) ?? 0) + count)
      continue
    }
    throw new Error(`无法解析的字符「${ch}」：${formula}`)
  }
  if (stack.length !== 1) throw new Error(`括号不匹配：${formula}`)
  const result = stack[0]
  if (result.size === 0) throw new Error(`化学式无效：${formula}`)
  return result
}

/** 计算化学式的摩尔质量（g/mol），保留 3 位小数 */
export function molarMass(formula: string): number {
  const counts = parseFormula(formula)
  let sum = 0
  counts.forEach((n, sym) => {
    const mass = ATOMIC_MASS[sym]
    if (mass === undefined) throw new Error(`未知元素：${sym}`)
    sum += mass * n
  })
  return Math.round(sum * 1000) / 1000
}

/** 将元素计数表格式化为可读字符串，如 H:2 O:1 */
export function formatCounts(counts: ElementCounts): string {
  return [...counts.entries()].map(([sym, n]) => `${sym}:${n}`).join(' ')
}

/* ---------- 分数运算（配平用的精确有理数） ---------- */

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = a % b
    a = b
    b = t
  }
  return a === 0 ? 1 : a
}

class Frac {
  readonly n: number
  readonly d: number
  private constructor(n: number, d: number) {
    const g = gcd(n, d)
    const sign = d < 0 ? -1 : 1
    this.n = (sign * n) / g
    this.d = (sign * d) / g
  }
  static of(n: number, d = 1): Frac {
    return new Frac(n, d)
  }
  isZero(): boolean {
    return this.n === 0
  }
  neg(): Frac {
    return new Frac(-this.n, this.d)
  }
  add(o: Frac): Frac {
    return new Frac(this.n * o.d + o.n * this.d, this.d * o.d)
  }
  sub(o: Frac): Frac {
    return this.add(o.neg())
  }
  mul(o: Frac): Frac {
    return new Frac(this.n * o.n, this.d * o.d)
  }
  div(o: Frac): Frac {
    // 调用方保证除数非零（主元查找只选取非零元）
    return new Frac(this.n * o.d, this.d * o.n)
  }
}

export interface BalancedEquation {
  reactants: string[]
  products: string[]
  coefficients: number[]
  /** 如 "2H₂ + O₂ = 2H₂O" 风格的纯文本（用下标数字仍为普通数字） */
  balanced: string
}

function lcm(a: number, b: number): number {
  return (Math.abs(a * b) / gcd(a, b)) as number
}

/**
 * 配平方程式（如 "H2+O2=H2O" 或 "H2 + O2 -> H2O"）。
 * 用高斯消元求齐次方程组的零空间，再化为最小正整数比。
 */
export function balanceEquation(equation: string): BalancedEquation {
  const s = equation.replace(/\s+/g, '')
  const sep = s.includes('->') ? '->' : s.includes('=') ? '=' : null
  if (sep === null) throw new Error('方程式需要用 = 或 -> 分隔反应物与生成物')
  const parts = s.split(sep)
  if (parts.length !== 2) throw new Error(`方程式格式无效：${equation}`)
  const reactants = parts[0].split('+').filter((x) => x !== '')
  const products = parts[1].split('+').filter((x) => x !== '')
  if (reactants.length === 0 || products.length === 0) {
    throw new Error('反应物和生成物都不能为空')
  }
  const compounds = [...reactants, ...products]
  const counts = compounds.map((c) => parseFormula(c))
  const elements = [...new Set(counts.flatMap((c) => [...c.keys()]))]
  const m = elements.length
  const n = compounds.length

  // 矩阵：行=元素，列=化合物；反应物为正、生成物为负
  const rows: Frac[][] = elements.map((el) =>
    compounds.map((_, j) => Frac.of((counts[j].get(el) ?? 0) * (j < reactants.length ? 1 : -1))),
  )

  // 化为行最简形（RREF）
  const pivotCols: number[] = []
  let r = 0
  for (let c = 0; c < n && r < m; c += 1) {
    let p = -1
    for (let i = r; i < m; i += 1) {
      if (!rows[i][c].isZero()) {
        p = i
        break
      }
    }
    if (p === -1) continue
    const tmp = rows[r]
    rows[r] = rows[p]
    rows[p] = tmp
    const piv = rows[r][c]
    rows[r] = rows[r].map((v) => v.div(piv))
    for (let i = 0; i < m; i += 1) {
      if (i === r || rows[i][c].isZero()) continue
      const f = rows[i][c]
      const prow = rows[r]
      rows[i] = rows[i].map((v, j) => v.sub(f.mul(prow[j])))
    }
    pivotCols.push(c)
    r += 1
  }

  const freeCols: number[] = []
  for (let c = 0; c < n; c += 1) {
    if (!pivotCols.includes(c)) freeCols.push(c)
  }
  if (freeCols.length !== 1) {
    throw new Error('该方程式的解不唯一或无解，无法自动配平')
  }
  // 零空间基向量：自由变量取 1
  const f = freeCols[0]
  const basis: Frac[] = compounds.map(() => Frac.of(0))
  basis[f] = Frac.of(1)
  for (let i = 0; i < pivotCols.length; i += 1) {
    basis[pivotCols[i]] = rows[i][f].neg()
  }
  // 化为整数：先通分再约分，取绝对值（反应物/生成物符号相反）
  let scale = 1
  for (const b of basis) scale = lcm(scale, b.d)
  let nums = basis.map((b) => Math.abs(b.n * (scale / b.d)))
  let g = 0
  for (const x of nums) g = gcd(g, x)
  nums = nums.map((x) => x / g)
  if (nums.some((x) => x <= 0)) {
    throw new Error('无法配平为正整数系数')
  }
  const fmt = (list: string[], offset: number): string =>
    list
      .map((name, i) => {
        const c = nums[offset + i]
        return `${c === 1 ? '' : c}${name}`
      })
      .join(' + ')
  return {
    reactants,
    products,
    coefficients: nums,
    balanced: `${fmt(reactants, 0)} = ${fmt(products, reactants.length)}`,
  }
}
