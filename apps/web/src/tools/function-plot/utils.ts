/**
 * function-plot（#826）工具函数：安全表达式解析、采样、画布坐标映射。
 * 纯函数，无 DOM / 网络依赖；不使用 eval/Function。
 */

type Token =
  | { type: 'num'; value: number }
  | { type: 'var' }
  | { type: 'op'; op: '+' | '-' | '*' | '/' | '^' }
  | { type: 'func'; name: string }
  | { type: 'neg' }
  | { type: 'lparen' }
  | { type: 'rparen' }

/** 允许的函数名 → 实现 */
export const ALLOWED_FUNCS: Readonly<Record<string, (x: number) => number>> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  log: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  abs: Math.abs,
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 }

function isUnaryPosition(prev: Token | null): boolean {
  return (
    prev === null ||
    prev.type === 'op' ||
    prev.type === 'lparen' ||
    prev.type === 'neg' ||
    prev.type === 'func'
  )
}

/** 分词：数字、x、运算符、括号、允许的函数名；其余抛中文错误 */
export function tokenize(expr: string): Token[] {
  const s = expr
  if (s.trim() === '') throw new Error('表达式不能为空')
  const tokens: Token[] = []
  let i = 0
  let prev: Token | null = null
  const push = (t: Token): void => {
    tokens.push(t)
    prev = t
  }
  while (i < s.length) {
    const ch = s[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1
      continue
    }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(s.slice(i))
      if (!m) throw new Error(`无法解析数字：${s.slice(i, i + 8)}`)
      push({ type: 'num', value: parseFloat(m[0]) })
      i += m[0].length
      continue
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      const m = /^[a-zA-Z]+/.exec(s.slice(i)) as RegExpExecArray
      const name = m[0]
      i += name.length
      const lower = name.toLowerCase()
      if (lower === 'x') push({ type: 'var' })
      else if (lower in ALLOWED_FUNCS) push({ type: 'func', name: lower })
      else throw new Error(`不支持的标识符：${name}`)
      continue
    }
    if (ch === '(') {
      push({ type: 'lparen' })
      i += 1
      continue
    }
    if (ch === ')') {
      push({ type: 'rparen' })
      i += 1
      continue
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      if (ch === '-' && isUnaryPosition(prev)) {
        push({ type: 'neg' })
      } else if (ch === '+' && isUnaryPosition(prev)) {
        i += 1 // 一元加号直接跳过
        continue
      } else {
        // 其余情况均为二元运算符（外层已限定字符范围）
        push({ type: 'op', op: ch as '+' | '-' | '*' | '/' | '^' })
      }
      i += 1
      continue
    }
    throw new Error(`无法解析的字符「${ch}」`)
  }
  return tokens
}

/** 调度场算法：中缀 token → 逆波兰 token */
export function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = []
  const stack: Token[] = []
  for (const t of tokens) {
    if (t.type === 'num' || t.type === 'var') {
      out.push(t)
    } else if (t.type === 'func' || t.type === 'neg') {
      stack.push(t)
    } else if (t.type === 'op') {
      // 函数只绑定紧随其后的操作数：sin x+1 = sin(x)+1。
      // 先闭合待处理的函数调用（含其参数前的一元负号，如 sin -3+1）。
      let k = stack.length - 1
      while (k >= 0 && stack[k].type === 'neg') k--
      if (k >= 0 && stack[k].type === 'func') {
        while (stack.length > k) out.push(stack.pop() as Token)
      }
      const pCur = PREC[t.op]
      while (stack.length > 0) {
        const top = stack[stack.length - 1]
        if (top.type === 'neg') {
          // 一元负号优先级介于 ^ 与 * 之间：-x^2 = -(x^2)，但 -a+b = (-a)+b
          if (pCur < PREC['^']) out.push(stack.pop() as Token)
          else break
        } else if (top.type === 'op') {
          const pTop = PREC[top.op]
          if (pTop > pCur || (pTop === pCur && t.op !== '^')) out.push(stack.pop() as Token)
          else break
        } else {
          break
        }
      }
      stack.push(t)
    } else if (t.type === 'lparen') {
      stack.push(t)
    } else {
      // 唯一剩余的 token 类型：右括号
      let found = false
      while (stack.length > 0) {
        const top = stack.pop() as Token
        if (top.type === 'lparen') {
          found = true
          break
        }
        out.push(top)
      }
      if (!found) throw new Error('括号不匹配')
      const top = stack[stack.length - 1]
      if (top && (top.type === 'func' || top.type === 'neg')) {
        out.push(stack.pop() as Token)
      }
    }
  }
  while (stack.length > 0) {
    const top = stack.pop() as Token
    if (top.type === 'lparen') throw new Error('括号不匹配')
    out.push(top)
  }
  return out
}

/** 解析表达式为可调用函数；语法非法抛中文错误 */
export function parseFunctionExpr(expr: string): (x: number) => number {
  const rpn = toRPN(tokenize(expr))
  return (x: number): number => {
    const stack: number[] = []
    for (const t of rpn) {
      if (t.type === 'num') {
        stack.push(t.value)
      } else if (t.type === 'var') {
        stack.push(x)
      } else if (t.type === 'neg' || t.type === 'func') {
        if (stack.length < 1) throw new Error('表达式无效')
        const a = stack.pop() as number
        stack.push(t.type === 'neg' ? -a : (ALLOWED_FUNCS[t.name] as (v: number) => number)(a))
      } else {
        // 剩余只可能是二元运算符（toRPN 不输出括号）
        const op = (t as { type: 'op'; op: '+' | '-' | '*' | '/' | '^' }).op
        if (stack.length < 2) throw new Error('表达式无效')
        const b = stack.pop() as number
        const a = stack.pop() as number
        if (op === '+') stack.push(a + b)
        else if (op === '-') stack.push(a - b)
        else if (op === '*') stack.push(a * b)
        else if (op === '/') stack.push(a / b)
        else stack.push(Math.pow(a, b))
      }
    }
    if (stack.length !== 1) throw new Error('表达式无效')
    return stack[0]
  }
}

export interface SamplePoint {
  x: number
  y: number
}

/** 在 [min, max] 上均匀采样 steps 个点（含端点） */
export function sampleFunction(
  fn: (x: number) => number,
  min: number,
  max: number,
  steps: number,
): SamplePoint[] {
  if (!Number.isInteger(steps) || steps < 2) throw new Error('采样点数必须为 ≥2 的整数')
  if (!(min < max)) throw new Error('区间最小值必须小于最大值')
  const pts: SamplePoint[] = []
  for (let i = 0; i < steps; i += 1) {
    const x = min + (i * (max - min)) / (steps - 1)
    pts.push({ x, y: fn(x) })
  }
  return pts
}

export interface CanvasPoint {
  cx: number
  cy: number
}

export interface PlotMapping {
  points: CanvasPoint[]
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

/**
 * 将采样点映射到画布坐标（y 轴翻转）。
 * 非有限 y 值映射为 cy=NaN，调用方可据此断开折线。
 */
export function mapToCanvas(
  points: SamplePoint[],
  width: number,
  height: number,
  padding = 24,
): PlotMapping {
  if (points.length === 0) throw new Error('没有可绘制的点')
  if (!(width > 0) || !(height > 0)) throw new Error('画布尺寸必须为正数')
  let xMin = Infinity
  let xMax = -Infinity
  let yMin = Infinity
  let yMax = -Infinity
  for (const p of points) {
    if (!Number.isFinite(p.y)) continue
    if (p.x < xMin) xMin = p.x
    if (p.x > xMax) xMax = p.x
    if (p.y < yMin) yMin = p.y
    if (p.y > yMax) yMax = p.y
  }
  if (xMin === Infinity) throw new Error('没有可绘制的有限点')
  if (xMin === xMax) {
    xMin -= 1
    xMax += 1
  }
  if (yMin === yMax) {
    yMin -= 1
    yMax += 1
  }
  const w = width - padding * 2
  const h = height - padding * 2
  const mapped = points.map((p) => {
    const cx = padding + ((p.x - xMin) / (xMax - xMin)) * w
    const cy = Number.isFinite(p.y) ? padding + (1 - (p.y - yMin) / (yMax - yMin)) * h : NaN
    return { cx, cy }
  })
  return { points: mapped, xMin, xMax, yMin, yMax }
}
