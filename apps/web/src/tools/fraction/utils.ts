import { Fraction } from 'fraction.js'
import type { FractionInput, FractionOptions } from './schema'

type Token =
  | { kind: 'num'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }

const TOKEN_RE = /\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+|[+\-*/^()]|\S)\s*/gy

/** 词法分析：分数 1/2、带分数 1 1/2、小数、整数、四则运算符与括号 */
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
    } else if (/^[\d./\s]+$/.test(t)) {
      tokens.push({ kind: 'num', value: t })
    } else {
      throw new Error('无法识别的字符：' + t)
    }
  }
  if (pos !== expr.length) throw new Error('无法解析的表达式：' + expr)
  if (tokens.length === 0) throw new Error('表达式不能为空')
  return tokens
}

function toFraction(token: string): Fraction {
  try {
    return new Fraction(token)
  } catch {
    throw new Error('无法解析数字：' + token)
  }
}

/** 递归下降求值：expr → term → factor → unary → primary，全部用 Fraction 精确运算 */
export function evaluate(expr: string): Fraction {
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

  function parseExpr(): Fraction {
    let left = parseTerm()
    for (;;) {
      const t = peek()
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        next()
        const right = parseTerm()
        left = t.value === '+' ? left.add(right) : left.sub(right)
      } else return left
    }
  }

  function parseTerm(): Fraction {
    let left = parseFactor()
    for (;;) {
      const t = peek()
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/')) {
        next()
        const right = parseFactor()
        if (t.value === '/') {
          if (right.equals(0)) throw new Error('除数不能为 0')
          left = left.div(right)
        } else {
          left = left.mul(right)
        }
      } else return left
    }
  }

  function parseFactor(): Fraction {
    const base = parseUnary()
    const t = peek()
    if (t?.kind === 'op' && t.value === '^') {
      next()
      const exp = parseFactor()
      const e = exp.valueOf()
      if (!Number.isInteger(e)) throw new Error('指数必须为整数：' + exp.toFraction())
      return base.pow(e)
    }
    return base
  }

  function parseUnary(): Fraction {
    const t = peek()
    if (t?.kind === 'op' && (t.value === '-' || t.value === '+')) {
      next()
      const v = parseUnary()
      return t.value === '-' ? v.neg() : v
    }
    return parsePrimary()
  }

  function parsePrimary(): Fraction {
    const t = next()
    if (!t) throw new Error('表达式不完整')
    if (t.kind === 'num') return toFraction(t.value)
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

/**
 * 分数的精确小数展开（BigInt 长除法，四舍五入到 digits 位）。
 * fraction.js 内部 n/d 已是 BigInt，任意精度都不丢。
 */
export function toDecimalString(f: Fraction, digits: number): string {
  const sign = f.s < 0 ? '-' : ''
  const n = f.n < 0 ? -f.n : f.n
  const d = f.d < 0 ? -f.d : f.d
  const scale = 10n ** BigInt(digits)
  let scaled = (n * scale * 10n) / d
  if (scaled % 10n >= 5n) scaled += 10n
  scaled /= 10n
  const intPart = scaled / scale
  const fracPart = (scaled % scale).toString().padStart(digits, '0').replace(/0+$/, '')
  if (fracPart === '') return sign + intPart.toString()
  return sign + intPart.toString() + '.' + fracPart
}

/** T2 同步入口 */
export function transform(input: FractionInput, options: FractionOptions): string {
  const expr = input.text.trim()
  if (expr === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const decimals = Number(options.decimals ?? '10')
  const result = evaluate(expr)

  return [
    `表达式：${expr}`,
    `分数：${result.toFraction()}`,
    `带分数：${result.toFraction(true)}`,
    `小数（${decimals} 位）：${toDecimalString(result, decimals)}`,
  ].join('\n')
}
