import { det, format, lusolve } from 'mathjs'
import type { EquationInput, EquationOptions } from './schema'
import { MODE_LABELS } from './schema'

/** 精度 14 位压平浮点噪声（如 0.1+0.2 → 0.3） */
function fmt(n: number): string {
  return format(n, { precision: 14 })
}

type Coeffs = { x2: number; x: number; y: number; c: number }

const ZERO: Coeffs = { x2: 0, x: 0, y: 0, c: 0 }

/** 把「2.5x」这类项的系数解析出来；空系数串表示 1 */
function numOf(s: string, sign: number, term: string): number {
  if (s === '') return sign
  const n = Number(s)
  if (!Number.isFinite(n)) throw new Error('无法解析的项：' + term)
  return sign * n
}

/** 解析等号一侧的多项式，支持变量 x、y 与 x^2 */
function parseSide(raw: string): Coeffs {
  const side = raw.replace(/\s+/g, '').toLowerCase().replace(/²/g, '^2')
  if (side === '') throw new Error('等号一侧不能为空')
  const out: Coeffs = { ...ZERO }
  const terms = side.match(/[+-]?[^+-]+/g)
  if (!terms) throw new Error('无法解析的表达式：' + raw)
  // 首项若以 + 开头，去掉以便正则统一处理
  for (const rawTerm of terms) {
    const term = rawTerm.startsWith('+') ? rawTerm.slice(1) : rawTerm
    const sign = term.startsWith('-') ? -1 : 1
    const body = term.replace(/^[+-]/, '')
    let m = body.match(/^(\d*\.?\d*)x\^2$/)
    if (m) {
      out.x2 += numOf(m[1], sign, term)
      continue
    }
    m = body.match(/^(\d*\.?\d*)x$/)
    if (m) {
      out.x += numOf(m[1], sign, term)
      continue
    }
    m = body.match(/^(\d*\.?\d*)y$/)
    if (m) {
      out.y += numOf(m[1], sign, term)
      continue
    }
    if (/^\d*\.?\d+$/.test(body)) {
      out.c += numOf(body, sign, term)
      continue
    }
    throw new Error('无法解析的项：' + term)
  }
  return out
}

/** 解析「左 = 右」，全部移到左侧得到 ax²+bx(+cy)+c=0 的系数 */
function parseEquation(eq: string): Coeffs {
  const parts = eq.split('=')
  if (parts.length !== 2) throw new Error('方程必须恰好包含一个等号：' + eq.trim())
  const left = parseSide(parts[0])
  const right = parseSide(parts[1])
  return {
    x2: left.x2 - right.x2,
    x: left.x - right.x,
    y: left.y - right.y,
    c: left.c - right.c,
  }
}

function solveLinear(coef: Coeffs): string {
  if (coef.x2 !== 0 || coef.y !== 0) throw new Error('这不是一元一次方程：请切换到对应模式')
  if (coef.x === 0) throw new Error(coef.c === 0 ? '恒等式：任意 x 都是解' : '矛盾方程：无解')
  return `解：x = ${fmt(-coef.c / coef.x)}`
}

function solveQuadratic(coef: Coeffs): string {
  if (coef.y !== 0) throw new Error('这不是一元方程：请切换到对应模式')
  const { x2: a, x: b, c } = coef
  if (a === 0) return solveLinear({ ...ZERO, x: b, c })
  const delta = b * b - 4 * a * c
  const lines = [`判别式 Δ = ${fmt(delta)}`]
  if (delta > 0) {
    const sq = Math.sqrt(delta)
    lines.push(`解：x₁ = ${fmt((-b - sq) / (2 * a))}，x₂ = ${fmt((-b + sq) / (2 * a))}`)
  } else if (delta === 0) {
    lines.push(`解（重根）：x = ${fmt(-b / (2 * a))}`)
  } else {
    const re = fmt(-b / (2 * a))
    const im = fmt(Math.sqrt(-delta) / (2 * a))
    lines.push('无实数解；复数解：')
    lines.push(`x₁ = ${re} − ${im}i，x₂ = ${re} + ${im}i`)
  }
  return lines.join('\n')
}

function solveSystem(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length !== 2) throw new Error('二元一次方程组需要恰好两行方程')
  const coefs = lines.map((l) => {
    const c = parseEquation(l)
    if (c.x2 !== 0) throw new Error('方程组只支持一次项：' + l)
    return c
  })
  // ax + by + c = 0  →  ax + by = -c，用 mathjs lusolve 求解。
  // lusolve 对奇异矩阵不抛错，先用行列式判定唯一性。
  const A = coefs.map((c) => [c.x, c.y])
  if (Math.abs(det(A)) < 1e-12) {
    throw new Error('方程组无唯一解（系数矩阵奇异：两直线平行或重合）')
  }
  const B = coefs.map((c) => -c.c)
  const raw = lusolve(A, B) as unknown
  if (!Array.isArray(raw) || !raw.every((row) => Array.isArray(row))) {
    throw new Error('方程组求解失败：返回结果格式异常')
  }
  const solution = raw as number[][]
  const [x, y] = [solution[0][0], solution[1][0]]
  return ['方程组：', ...lines, `解：x = ${fmt(x)}，y = ${fmt(y)}`].join('\n')
}

/** T3 同步入口（也是复制 / 下载用的纯文本） */
export function transform(input: EquationInput, options: EquationOptions): string {
  const eqText = input.text.trim()
  if (eqText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const mode = options.mode
  const head = `模式：${MODE_LABELS[mode]}`
  switch (mode) {
    case 'linear': {
      const coef = parseEquation(eqText)
      return [head, `方程：${eqText}`, solveLinear(coef)].join('\n')
    }
    case 'quadratic': {
      const coef = parseEquation(eqText)
      return [head, `方程：${eqText}`, solveQuadratic(coef)].join('\n')
    }
    case 'system':
      return [head, solveSystem(eqText)].join('\n')
  }
}
