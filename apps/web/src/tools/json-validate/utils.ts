import type { ValidateInput, ValidateOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonValidateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonValidateError'
  }
}

/** 单次处理上限：超过则拒绝，避免超大文本卡死主线程 */
export const MAX_INPUT = 1_000_000

/** 嵌套上限：既是防爆栈，也用来拦住自引用 / 死循环生成的结构 */
const MAX_DEPTH = 2_000

/** JSON 数字语法：不允许前导零、不允许以点开头，也不允许孤立的指数符号 */
const NUMBER = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/

/** 数字 token 里允许出现的字符，用于先把完整 token 切出来再整体校验 */
const NUMBER_CHAR = /[-+0-9.eEA-Za-z]/

/** 三种字面量，逐个前缀匹配 */
const LITERALS: readonly (readonly [string, unknown])[] = [
  ['true', true],
  ['false', false],
  ['null', null],
]

interface State {
  readonly text: string
  /** 当前读到的位置 */
  i: number
  maxDepth: number
  nodes: number
  keys: number
  /** 非严格模式下收集到的重复键名 */
  duplicates: string[]
}

/**
 * 计算行列号 —— 报错只给字符下标没法用，必须换算成人能对上的位置。
 * 错误路径上最多算一次，O(n) 扫描足够快。
 */
function lineCol(text: string, pos: number): { line: number; col: number } {
  let line = 1
  let lineStart = 0
  for (let p = 0; p < pos; p += 1) {
    if (text.charCodeAt(p) === 10) {
      line += 1
      lineStart = p + 1
    }
  }
  return { line, col: pos - lineStart + 1 }
}

/** 抛出带行列号的中文错误 */
function fail(state: State, message: string, pos: number = state.i): never {
  const { line, col } = lineCol(state.text, pos)
  throw new JsonValidateError(`第 ${line} 行第 ${col} 列：${message}`)
}

function skipWs(state: State): void {
  while (state.i < state.text.length) {
    const ch = state.text[state.i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') state.i += 1
    else return
  }
}

/** 把当前字符描述成可读的片段，避免报错里出现裸换行之类没法看的字符 */
function describe(ch: string | undefined): string {
  if (ch === undefined) return '内容结尾'
  return `"${ch.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`
}

/** 单个字符的转义对照表，`u` 后面跟 4 位十六进制，单独处理 */
const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
}

/** 解析字符串字面量，顺带完成转义与控制字符校验 */
function parseString(state: State): string {
  state.i += 1
  let out = ''
  for (;;) {
    if (state.i >= state.text.length) fail(state, '字符串没有闭合，缺少右侧引号')
    const ch = state.text[state.i]
    if (ch === '"') {
      state.i += 1
      return out
    }
    if (ch === '\\') {
      const esc = state.text[state.i + 1]
      if (esc === undefined) fail(state, '反斜杠转义符后面没有内容')
      state.i += 2
      if (esc === 'u') {
        const hex = state.text.slice(state.i, state.i + 4)
        if (!/^[0-9a-fA-F]{4}$/.test(hex))
          fail(state, `\\u 转义必须是 4 位十六进制数，实际是 ${describe(hex)}`)
        out += String.fromCharCode(Number.parseInt(hex, 16))
        state.i += 4
        continue
      }
      const mapped = SIMPLE_ESCAPES[esc]
      if (mapped === undefined) fail(state, `不支持的转义 \\${esc}`)
      out += mapped
      continue
    }
    if (ch.charCodeAt(0) < 0x20) fail(state, '字符串里出现了不能直接书写的控制字符')
    out += ch
    state.i += 1
  }
}

function parseNumber(state: State): number {
  const start = state.i
  while (state.i < state.text.length && NUMBER_CHAR.test(state.text[state.i])) state.i += 1
  const token = state.text.slice(start, state.i)
  if (!NUMBER.test(token)) fail(state, `非法数字 ${token}`, start)
  return Number(token)
}

function parseLiteral(state: State): unknown {
  for (const [word, value] of LITERALS) {
    if (state.text.startsWith(word, state.i)) {
      state.i += word.length
      return value
    }
  }
  return fail(state, '这里应该是一个值（只支持对象、数组、字符串、数字和 true / false / null）')
}

/**
 * 解析对象。`depth` 是外层已经套了几层容器，本层的嵌套层数就是 depth + 1。
 * 空对象在这里提前返回，后面的循环因此假设「至少有一个成员」。
 */
function parseObject(state: State, depth: number, strict: boolean): Record<string, unknown> {
  state.nodes += 1
  state.maxDepth = Math.max(state.maxDepth, depth + 1)
  state.i += 1
  const result: Record<string, unknown> = {}
  const seen = new Set<string>()
  skipWs(state)
  if (state.i < state.text.length && state.text[state.i] === '}') {
    state.i += 1
    return result
  }
  for (;;) {
    skipWs(state)
    if (state.i >= state.text.length) fail(state, '对象没有闭合，缺少 }')
    const ch = state.text[state.i]
    // 走到这里说明上一轮吃了逗号，本该跟一个新成员
    if (ch === '}') fail(state, '对象成员之后出现了多余的逗号（不允许尾随逗号）')
    if (ch !== '"') fail(state, `对象的键必须是双引号字符串，实际是 ${describe(ch)}`)
    const key = parseString(state)
    skipWs(state)
    if (state.i >= state.text.length || state.text[state.i] !== ':') {
      fail(state, `键 ${key} 后面缺少冒号`)
    }
    state.i += 1
    if (seen.has(key)) {
      // 重复键不算语法错误，但往往意味着上游拼接数据出错，必须说出来
      if (strict) fail(state, `严格模式下不允许重复键 ${key}`)
      if (!state.duplicates.includes(key)) state.duplicates.push(key)
    }
    seen.add(key)
    state.keys += 1
    result[key] = parseValue(state, depth + 1, strict)
    skipWs(state)
    if (state.i >= state.text.length) fail(state, '对象没有闭合，缺少 }')
    const after = state.text[state.i]
    if (after === ',') {
      state.i += 1
      continue
    }
    if (after === '}') {
      state.i += 1
      return result
    }
    fail(state, `对象成员之后应当是逗号或 }，实际是 ${describe(after)}`)
  }
}

/** 解析数组，与对象的差别只是成员没有键；同样不支持尾随逗号 */
function parseArray(state: State, depth: number, strict: boolean): unknown[] {
  state.nodes += 1
  state.maxDepth = Math.max(state.maxDepth, depth + 1)
  state.i += 1
  const result: unknown[] = []
  skipWs(state)
  if (state.i < state.text.length && state.text[state.i] === ']') {
    state.i += 1
    return result
  }
  for (;;) {
    skipWs(state)
    if (state.i >= state.text.length) fail(state, '数组没有闭合，缺少 ]')
    if (state.text[state.i] === ']') fail(state, '数组元素之后出现了多余的逗号（不允许尾随逗号）')
    result.push(parseValue(state, depth + 1, strict))
    skipWs(state)
    if (state.i >= state.text.length) fail(state, '数组没有闭合，缺少 ]')
    const after = state.text[state.i]
    if (after === ',') {
      state.i += 1
      continue
    }
    if (after === ']') {
      state.i += 1
      return result
    }
    fail(state, `数组元素之后应当是逗号或 ]，实际是 ${describe(after)}`)
  }
}

/** 解析任意值：`depth` 为外层容器层数，容器自身会在 parseObject / parseArray 里更新 maxDepth */
function parseValue(state: State, depth: number, strict: boolean): unknown {
  if (depth > MAX_DEPTH) fail(state, `嵌套层级超过 ${MAX_DEPTH} 层`)
  skipWs(state)
  if (state.i >= state.text.length) fail(state, '内容意外结束，这里应该有一个值')
  const ch = state.text[state.i]
  if (ch === '{') return parseObject(state, depth, strict)
  if (ch === '[') return parseArray(state, depth, strict)
  state.nodes += 1
  if (ch === '"') return parseString(state)
  if (ch === '-' || (ch >= '0' && ch <= '9')) return parseNumber(state)
  return parseLiteral(state)
}

/** 顶层类型名：array 单独处理，其余用 typeof */
function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * 校验 JSON 合法性 —— 纯函数，不依赖 React / DOM。
 *
 * 不用 `JSON.parse` 有两处原因：它抛出的错误机型之间文案不一致（V8 与 JSC 不同），
 * 也不会报位置；而从位置上比看字面量更容易定位「多了一个逗号」这类问题。
 */
export function transform(input: ValidateInput, options: ValidateOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonValidateError(`输入超过 ${MAX_INPUT} 字符上限`)
  }

  const state: State = {
    text: input.text,
    i: 0,
    maxDepth: 0,
    nodes: 0,
    keys: 0,
    duplicates: [],
  }
  // 顶层值外没有容器，故从 0 开始；容器内才累加嵌套层数
  const root = parseValue(state, 0, options.strict)
  skipWs(state)
  if (state.i < state.text.length) fail(state, '顶层值之后还有多余内容')

  const lines = [
    'JSON 合法',
    `顶层类型：${typeOf(root)}`,
    `顶层条目数：${Array.isArray(root) ? root.length : root !== null && typeof root === 'object' ? Object.keys(root).length : 0}`,
    `键总数：${state.keys}`,
    `节点总数：${state.nodes}`,
    `最大深度：${state.maxDepth}`,
    `字符数：${input.text.length}`,
  ]
  if (state.duplicates.length > 0) {
    lines.push(`警告：存在重复键 ${state.duplicates.join('、')}（解析时取最后一次出现的值）`)
  }
  return lines.join('\n')
}
