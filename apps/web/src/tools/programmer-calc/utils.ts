import type { ProgrammerCalcInput, ProgrammerCalcOptions } from './schema'

/**
 * 程序员计算器：手写 tokenizer + shunting-yard（不使用 eval / Function）。
 * 全程 BigInt 运算，仅支持整数；除法向零取整（BigInt `/` 天然如此）。
 */

type Op = '+' | '-' | '*' | '/' | '%' | '<<' | '>>' | '&' | '^' | '|' | 'u-' | '~'

interface NumToken {
  readonly kind: 'num'
  readonly value: bigint
}
interface OpToken {
  readonly kind: 'op'
  readonly op: Op
}
interface ParenToken {
  readonly kind: 'paren'
  readonly open: boolean
}
type Token = NumToken | OpToken | ParenToken

/** C 语言优先级：单目 > * / % > + - > << >> > & > ^ > | */
const PRECEDENCE: Record<Op, number> = {
  '|': 0,
  '^': 1,
  '&': 2,
  '<<': 3,
  '>>': 3,
  '+': 4,
  '-': 4,
  '*': 5,
  '/': 5,
  '%': 5,
  'u-': 6,
  '~': 6,
}
const RIGHT_ASSOC: ReadonlySet<Op> = new Set(['u-', '~'])

/** 解析 0b/0o/0x 前缀或十进制整数字面量 */
function parseLiteral(raw: string): bigint {
  let base = 10
  let digits = raw
  if (/^0[bB]/.test(raw)) {
    base = 2
    digits = raw.slice(2)
  } else if (/^0[oO]/.test(raw)) {
    base = 8
    digits = raw.slice(2)
  } else if (/^0[xX]/.test(raw)) {
    base = 16
    digits = raw.slice(2)
  }
  if (digits === '') throw new Error(`数字 "${raw}" 缺少有效数字`)
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base)
  let value = 0n
  for (const ch of digits.toLowerCase()) {
    const digit = alphabet.indexOf(ch)
    if (digit < 0) throw new Error(`数字 "${raw}" 非法`)
    value = value * BigInt(base) + BigInt(digit)
  }
  return value
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  // 上一个 token 的种类，用于区分单目 -（表达式开头 / 运算符后 / 左括号后）
  let prev: 'operand' | 'op' | 'lparen' | 'start' = 'start'
  while (i < expr.length) {
    const ch = expr[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '.') throw new Error('仅支持整数运算')
    if (ch === '(') {
      tokens.push({ kind: 'paren', open: true })
      prev = 'lparen'
      i += 1
      continue
    }
    if (ch === ')') {
      tokens.push({ kind: 'paren', open: false })
      prev = 'operand'
      i += 1
      continue
    }
    if ((ch === '<' || ch === '>') && expr[i + 1] === ch) {
      tokens.push({ kind: 'op', op: (ch + ch) as '<<' | '>>' })
      prev = 'op'
      i += 2
      continue
    }
    if (ch === '&' || ch === '|' || ch === '^' || ch === '*' || ch === '/' || ch === '%') {
      tokens.push({ kind: 'op', op: ch as Op })
      prev = 'op'
      i += 1
      continue
    }
    if (ch === '~') {
      tokens.push({ kind: 'op', op: '~' })
      prev = 'op'
      i += 1
      continue
    }
    if (ch === '+' || ch === '-') {
      if (prev === 'start' || prev === 'op' || prev === 'lparen') {
        if (ch === '-') {
          tokens.push({ kind: 'op', op: 'u-' })
          prev = 'op'
          i += 1
          continue
        }
        throw new Error('表达式无效：此处不允许出现 "+"')
      }
      tokens.push({ kind: 'op', op: ch })
      prev = 'op'
      i += 1
      continue
    }
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < expr.length && /[0-9a-zA-Z]/.test(expr[j])) j += 1
      tokens.push({ kind: 'num', value: parseLiteral(expr.slice(i, j)) })
      prev = 'operand'
      i = j
      continue
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i
      while (j < expr.length && /[0-9a-zA-Z]/.test(expr[j])) j += 1
      throw new Error(`无法识别的字符："${expr.slice(i, j)}"`)
    }
    throw new Error(`无法识别的字符："${ch}"`)
  }
  return tokens
}

/** shunting-yard：中缀 → 逆波兰 */
function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = []
  const stack: Token[] = []
  for (const token of tokens) {
    if (token.kind === 'num') {
      output.push(token)
      continue
    }
    if (token.kind === 'paren') {
      if (token.open) {
        stack.push(token)
      } else {
        let found = false
        while (stack.length > 0) {
          const top = stack.pop() as Token
          if (top.kind === 'paren' && top.open) {
            found = true
            break
          }
          output.push(top)
        }
        if (!found) throw new Error('括号不匹配')
      }
      continue
    }
    const op = token.op
    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      if (top.kind !== 'op') break
      const higher =
        PRECEDENCE[top.op] > PRECEDENCE[op] ||
        (PRECEDENCE[top.op] === PRECEDENCE[op] && !RIGHT_ASSOC.has(op))
      if (!higher) break
      output.push(stack.pop() as Token)
    }
    stack.push(token)
  }
  while (stack.length > 0) {
    const top = stack.pop() as Token
    if (top.kind === 'paren') throw new Error('括号不匹配')
    output.push(top)
  }
  return output
}

const MAX_SHIFT = 1_000_000n

function checkShift(b: bigint): void {
  if (b < 0n || b > MAX_SHIFT) throw new Error('移位位数超出范围')
}

/** 逆波兰求值 */
function evalRpn(rpn: Token[]): bigint {
  const stack: bigint[] = []
  for (const token of rpn) {
    if (token.kind === 'num') {
      stack.push(token.value)
      continue
    }
    if (token.kind === 'paren') throw new Error('表达式无效，请检查语法')
    if (token.op === 'u-') {
      const a = stack.pop()
      if (a === undefined) throw new Error('表达式无效，请检查语法')
      stack.push(-a)
      continue
    }
    if (token.op === '~') {
      const a = stack.pop()
      if (a === undefined) throw new Error('表达式无效，请检查语法')
      stack.push(~a)
      continue
    }
    const b = stack.pop()
    const a = stack.pop()
    if (a === undefined || b === undefined) throw new Error('表达式无效，请检查语法')
    switch (token.op) {
      case '+':
        stack.push(a + b)
        break
      case '-':
        stack.push(a - b)
        break
      case '*':
        stack.push(a * b)
        break
      case '/':
        if (b === 0n) throw new Error('除数不能为 0')
        stack.push(a / b)
        break
      case '%':
        if (b === 0n) throw new Error('除数不能为 0')
        stack.push(a % b)
        break
      case '<<':
        checkShift(b)
        stack.push(a << b)
        break
      case '>>':
        checkShift(b)
        stack.push(a >> b)
        break
      case '&':
        stack.push(a & b)
        break
      case '^':
        stack.push(a ^ b)
        break
      case '|':
        stack.push(a | b)
        break
    }
  }
  if (stack.length !== 1) throw new Error('表达式无效，请检查语法')
  return stack[0] as bigint
}

export function evaluate(expr: string): bigint {
  return evalRpn(toRpn(tokenize(expr)))
}

/** T2 同步入口：输出十/十六/八/二进制四行对照 */
export function transform(input: ProgrammerCalcInput, _options: ProgrammerCalcOptions): string {
  const expr = input.text.trim()
  if (expr === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const value = evaluate(expr)
  const abs = value < 0n ? -value : value
  const dec = value.toString(10)
  const hex = abs.toString(16).toUpperCase()
  const oct = abs.toString(8)
  const bin = abs.toString(2)
  return [`十进制：${dec}`, `十六进制：0x${hex}`, `八进制：0o${oct}`, `二进制：0b${bin}`].join('\n')
}
