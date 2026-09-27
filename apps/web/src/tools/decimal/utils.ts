import Decimal from 'decimal.js'
import type { DecimalInput, DecimalOptions } from './schema'

/** 同一套递归下降解析器，分别跑在 Decimal（精确）与 number（JS 浮点）两种算术上 */
interface Arith<T> {
  num(raw: string): T
  add(a: T, b: T): T
  sub(a: T, b: T): T
  mul(a: T, b: T): T
  div(a: T, b: T): T
  pow(a: T, b: T): T
  neg(a: T): T
}

export const decimalArith: Arith<Decimal> = {
  num: (raw) => {
    try {
      return new Decimal(raw)
    } catch {
      throw new Error('无法解析数字：' + raw)
    }
  },
  add: (a, b) => a.plus(b),
  sub: (a, b) => a.minus(b),
  mul: (a, b) => a.times(b),
  div: (a, b) => {
    if (b.isZero()) throw new Error('除数不能为 0')
    return a.div(b)
  },
  pow: (a, b) => a.pow(b),
  neg: (a) => a.neg(),
}

export const floatArith: Arith<number> = {
  num: (raw) => {
    const n = Number(raw)
    if (Number.isNaN(n)) throw new Error('无法解析数字：' + raw)
    return n
  },
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  pow: (a, b) => a ** b,
  neg: (a) => -a,
}

type Token =
  | { kind: 'num'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }

/** 数字支持小数与科学计数法（如 1.5e-3） */
const TOKEN_RE = /\s*((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[+\-*/^()]|\S)\s*/gy

export function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  let pos = 0
  while ((m = TOKEN_RE.exec(expr)) !== null) {
    const t = m[1]
    pos = m.index + m[0].length
    if (t === '(') tokens.push({ kind: 'lparen' })
    else if (t === ')') tokens.push({ kind: 'rparen' })
    else if (t === '+' || t === '-' || t === '*' || t === '/' || t === '^') {
      tokens.push({ kind: 'op', value: t })
    } else if (/^[\d.eE+-]+$/.test(t) && /\d/.test(t)) {
      tokens.push({ kind: 'num', value: t })
    } else {
      throw new Error('无法识别的字符：' + t)
    }
  }
  if (pos !== expr.length) throw new Error('无法解析的表达式：' + expr)
  if (tokens.length === 0) throw new Error('表达式不能为空')
  return tokens
}

/** 递归下降求值：expr → term → factor(^) → unary → primary */
export function evaluate<T>(expr: string, arith: Arith<T>): T {
  const tokens = tokenize(expr)
  let pos = 0

  function peek(): Token | undefined {
    return tokens[pos]
  }
  function next(): Token {
    const t = tokens[pos]
    pos += 1
    return t
  }

  function parseExpr(): T {
    let left = parseTerm()
    for (;;) {
      const t = peek()
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        next()
        const right = parseTerm()
        left = t.value === '+' ? arith.add(left, right) : arith.sub(left, right)
      } else return left
    }
  }

  function parseTerm(): T {
    let left = parseFactor()
    for (;;) {
      const t = peek()
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/')) {
        next()
        const right = parseFactor()
        left = t.value === '*' ? arith.mul(left, right) : arith.div(left, right)
      } else return left
    }
  }

  function parseFactor(): T {
    const base = parseUnary()
    const t = peek()
    if (t?.kind === 'op' && t.value === '^') {
      next()
      return arith.pow(base, parseFactor())
    }
    return base
  }

  function parseUnary(): T {
    const t = peek()
    if (t?.kind === 'op' && (t.value === '-' || t.value === '+')) {
      next()
      const v = parseUnary()
      return t.value === '-' ? arith.neg(v) : v
    }
    return parsePrimary()
  }

  function parsePrimary(): T {
    const t = next()
    if (!t) throw new Error('表达式不完整')
    if (t.kind === 'num') return arith.num(t.value)
    if (t.kind === 'lparen') {
      const v = parseExpr()
      const closing = next()
      if (!closing || closing.kind !== 'rparen') throw new Error('括号未闭合')
      return v
    }
    throw new Error('表达式无效：多余的运算符或括号')
  }

  const result = parseExpr()
  if (pos !== tokens.length) throw new Error('表达式无效：存在多余内容')
  return result
}

/** T2 同步入口 */
export function transform(input: DecimalInput, _options: DecimalOptions): string {
  const expr = input.text.trim()
  if (expr === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const precise = evaluate(expr, decimalArith)
  if (!precise.isFinite()) throw new Error('结果不是有限数值')
  const floatValue = evaluate(expr, floatArith)
  const [num, den] = precise.toFraction()

  return [
    `表达式：${expr}`,
    `精确结果：${precise.toString()}`,
    `JS 浮点结果：${String(floatValue)}`,
    `科学计数法：${precise.toExponential()}`,
    `分数：${num.toString()}/${den.toString()}`,
    `（decimal.js 默认 20 位有效数字）`,
  ].join('\n')
}
