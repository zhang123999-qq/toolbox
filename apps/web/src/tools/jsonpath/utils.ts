import type { JsonPathInput, JsonPathOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonPathError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonPathError'
  }
}

/** 单次处理上限：超过则拒绝，避免超大文本卡死主线程 */
export const MAX_INPUT = 1_000_000

/** 匹配上限：`[*]` 这种通配在深层结构上会爆炸，必须封顶 */
const MAX_MATCHES = 100_000

/** 嵌套上限：递归求值受调用栈限制 */
const MAX_DEPTH = 2_000

/** 路径模式下取值的预览长度 */
const PREVIEW = 80

/** 一次查询的命中项：路径 + 取值，两种输出模式共用同一份结果 */
interface Match {
  readonly path: string
  readonly value: unknown
}

type Step =
  | { readonly kind: 'key'; readonly name: string }
  | { readonly kind: 'index'; readonly index: number }
  | { readonly kind: 'wildcard' }
  | { readonly kind: 'descend'; readonly name: string }
  | { readonly kind: 'descendWildcard' }
  | { readonly kind: 'union'; readonly items: readonly Step[] }

/** 是否普通对象（排除 null 与数组） */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 从忽略引号的前提下找右方括号，遇到字符串内部的 ] 不会被截胡 */
function findBracketEnd(expr: string, start: number): number {
  let quote = ''
  for (let i = start; i < expr.length; i += 1) {
    const ch = expr[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === ']') return i
  }
  throw new JsonPathError(`表达式缺少配套的 ]：${expr}`)
}

/** 读一段属性名：一直读到下一个 . 或 [ 为止，中文键名也能读进来 */
function readName(expr: string, start: number): string {
  let end = start
  while (end < expr.length && expr[end] !== '.' && expr[end] !== '[') end += 1
  return expr.slice(start, end)
}

/** 按逗号切分并集，忽略引号内的逗号 */
function splitUnion(inner: string): readonly string[] {
  const parts: string[] = []
  let quote = ''
  let start = 0
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]
    if (quote) {
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === ',') {
      parts.push(inner.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(inner.slice(start).trim())
  return parts.filter((part) => part !== '')
}

/** 把一个方括号片段翻译成单个 step */
function stepFromPart(part: string): Step {
  if (/^-?\d+$/.test(part)) return { kind: 'index', index: Number(part) }
  if (
    part.length >= 2 &&
    (part.startsWith('"') || part.startsWith("'")) &&
    part.endsWith(part[0])
  ) {
    return { kind: 'key', name: part.slice(1, -1) }
  }
  throw new JsonPathError(`不支持的方括号片段 [${part}]（可用下标、通配 * 或带引号的属性名）`)
}

/**
 * 解析表达式为 step 序列。
 *
 * 规划表原定用 jsonpath-plus，但新增依赖被禁止；这里实现日常够用的子集，
 * 遇到不支持的语法一律明确抛错，而不是「查出来一半结果」让人误判。
 */
function parseExpression(expr: string): readonly Step[] {
  const steps: Step[] = []
  if (!expr.startsWith('$')) {
    throw new JsonPathError('表达式必须以 $ 开头，例如 $.store.book[0].title')
  }
  let i = 1
  while (i < expr.length) {
    const ch = expr[i]
    if (ch === '.') {
      const recursive = expr[i + 1] === '.'
      const nameStart = i + (recursive ? 2 : 1)
      const name = readName(expr, nameStart)
      if (name === '') throw new JsonPathError(`表达式在点号之后缺少属性名：${expr}`)
      i = nameStart + name.length
      if (name === '*') {
        steps.push(recursive ? { kind: 'descendWildcard' } : { kind: 'wildcard' })
        continue
      }
      steps.push(recursive ? { kind: 'descend', name } : { kind: 'key', name })
      continue
    }
    if (ch === '[') {
      const close = findBracketEnd(expr, i + 1)
      const inner = expr.slice(i + 1, close).trim()
      i = close + 1
      if (inner === '') throw new JsonPathError(`表达式里有空的方括号：${expr}`)
      // 筛选与切片是本口径明确不做的部分，提前说清比默默返回空结果好
      if (inner.includes('?'))
        throw new JsonPathError('不支持筛选表达式 [?(...)]（见 README 限制一节）')
      if (inner.includes(':'))
        throw new JsonPathError('不支持切片语法 [start:end]（见 README 限制一节）')
      if (inner === '*') {
        steps.push({ kind: 'wildcard' })
        continue
      }
      const parts = splitUnion(inner)
      steps.push(
        parts.length === 1
          ? stepFromPart(parts[0])
          : { kind: 'union', items: parts.map(stepFromPart) },
      )
      continue
    }
    throw new JsonPathError(`不支持的语法：${expr.slice(i)}（本工具只实现 JSONPath 子集）`)
  }
  return steps
}

/** 负下标按「从末尾数」处理，越界返回空而不是包成 undefined */
function applyIndex(value: unknown[], index: number, path: string): readonly Match[] {
  const resolved = index < 0 ? value.length + index : index
  if (resolved < 0 || resolved >= value.length) return []
  return [{ path: `${path}[${resolved}]`, value: value[resolved] }]
}

/** 递归收集所有同名后代：先把命中的节点记下来，再继续往下钻 */
function collectDescendants(value: unknown, name: string, path: string): readonly Match[] {
  const found: Match[] = []
  function walk(node: unknown, nodePath: string, depth: number): void {
    if (depth > MAX_DEPTH) throw new JsonPathError(`JSON 嵌套超过 ${MAX_DEPTH} 层`)
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${nodePath}[${index}]`, depth + 1))
      return
    }
    if (!isPlainObject(node)) return
    for (const key of Object.keys(node)) {
      const childPath = `${nodePath}.${key}`
      if (key === name) found.push({ path: childPath, value: node[key] })
      walk(node[key], childPath, depth + 1)
    }
  }
  walk(value, path, 1)
  return found
}

/** 收集自身及所有后代节点，供 `..*` 使用 */
function collectAll(value: unknown, path: string): readonly Match[] {
  const found: Match[] = [{ path, value }]
  function walk(node: unknown, nodePath: string, depth: number): void {
    if (depth > MAX_DEPTH) throw new JsonPathError(`JSON 嵌套超过 ${MAX_DEPTH} 层`)
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${nodePath}[${index}]`, depth + 1))
      return
    }
    if (!isPlainObject(node)) return
    for (const key of Object.keys(node)) {
      const childPath = `${nodePath}.${key}`
      found.push({ path: childPath, value: node[key] })
      walk(node[key], childPath, depth + 1)
    }
  }
  walk(value, path, 1)
  return found
}

/** 把单个 step 作用在一个命中项上，返回新的命中集合 */
function applyStep(item: Match, step: Step): readonly Match[] {
  const { value, path } = item
  switch (step.kind) {
    case 'key':
      return isPlainObject(value) && step.name in value
        ? [{ path: `${path}.${step.name}`, value: value[step.name] }]
        : []
    case 'index':
      return Array.isArray(value) ? applyIndex(value, step.index, path) : []
    case 'wildcard': {
      if (Array.isArray(value)) {
        return value.map((child, index) => ({ path: `${path}[${index}]`, value: child }))
      }
      if (isPlainObject(value)) {
        return Object.keys(value).map((key) => ({ path: `${path}.${key}`, value: value[key] }))
      }
      return []
    }
    case 'descend':
      return isPlainObject(value) || Array.isArray(value)
        ? collectDescendants(value, step.name, path)
        : []
    case 'descendWildcard':
      return collectAll(value, path)
    case 'union':
      return step.items.flatMap((child) => applyStep(item, child))
  }
}

/** 路径模式下的取值预览，长字符串截断，避免一行撑爆输出区 */
function preview(value: unknown): string {
  const text = value === null ? 'null' : (JSON.stringify(value) ?? String(value))
  if (text.length <= PREVIEW) return text
  return `${text.slice(0, PREVIEW - 1)}…（共 ${text.length} 字符）`
}

/**
 * JSONPath 查询 —— 纯函数，不依赖 React / DOM。
 *
 * 采用「逐 step 收窄命中集合」的广度推进，而不是一次递归到底：
 * 这样 `[*]` 与 `..name` 这类会分叉的表达式也能按文档顺序稳定输出。
 */
export function transform(input: JsonPathInput, options: JsonPathOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonPathError(`输入超过 ${MAX_INPUT} 字符上限`)
  }
  const expression = options.pattern.trim()
  if (expression === '')
    throw new JsonPathError('请填写 JSONPath 表达式，例如 $.store.book[0].title')

  let root: unknown
  try {
    root = JSON.parse(input.text)
  } catch {
    throw new JsonPathError('不是合法的 JSON')
  }

  const steps = parseExpression(expression)
  let matches: readonly Match[] = [{ path: '$', value: root }]
  for (const step of steps) {
    const next = matches.flatMap((item) => applyStep(item, step))
    if (next.length > MAX_MATCHES) {
      throw new JsonPathError(`匹配结果超过 ${MAX_MATCHES} 条，请收窄表达式`)
    }
    matches = next
  }

  if (matches.length === 0) return '无匹配结果'
  if (options.mode === 'value') {
    return JSON.stringify(
      matches.map((item) => item.value),
      null,
      2,
    )
  }
  return matches.map((item) => `${item.path} = ${preview(item.value)}`).join('\n')
}
