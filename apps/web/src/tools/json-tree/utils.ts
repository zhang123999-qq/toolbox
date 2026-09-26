import type { JsonTreeInput, JsonTreeOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonTreeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonTreeError'
  }
}

/** 单次处理上限：超过则拒绝，避免超大文本卡死主线程 */
export const MAX_INPUT = 1_000_000

/** 节点上限：树形输出一行一个节点，几十万行既刷不动也没有可读性 */
const MAX_NODES = 200_000

/** 嵌套上限：递归展开受调用栈限制，超了先报错而不是崩页面 */
const MAX_DEPTH = 2_000

/** 字符串预览截断阈值：长文本只留前若干字符，避免一行撑爆输出区 */
const PREVIEW = 80

interface Ctx {
  nodes: number
  readonly lines: string[]
}

/** 一层缩进两个空格，与常用 JSON 缩进档位一致 */
const INDENT = '  '

/** 是否「普通对象」：排除 null 与数组，它们各有自己的展开方式 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 取值预览：标量一律串成 JSON 字面量，超长字符串截断并标注原始长度 */
function preview(value: unknown): string {
  const text = JSON.stringify(value) ?? String(value)
  if (value === null) return 'null'
  if (text.length <= PREVIEW) return text
  return `${text.slice(0, PREVIEW - 1)}…（共 ${text.length} 字符）`
}

/** 节点的类型名：数组单独叫 array，其余沿用 typeof */
function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isPlainObject(value)) return 'object'
  return typeof value
}

/** 对象键序列：sortKeys 开启时按字典序，否则保留原始书写顺序 */
function keysOf(value: Record<string, unknown>, sortKeys: boolean): readonly string[] {
  const keys = Object.keys(value)
  return sortKeys ? [...keys].sort() : keys
}

/** 展开成缩进树：容器一行、成员逐层右移两格 */
function writeNode(
  ctx: Ctx,
  value: unknown,
  key: string,
  indent: string,
  options: JsonTreeOptions,
  depth: number,
): void {
  if (depth > MAX_DEPTH) throw new JsonTreeError(`JSON 嵌套超过 ${MAX_DEPTH} 层，无法展开`)
  ctx.nodes += 1
  if (ctx.nodes > MAX_NODES) {
    throw new JsonTreeError(`节点数超过 ${MAX_NODES}，树太长了，请先取子集再查看`)
  }
  if (Array.isArray(value)) {
    ctx.lines.push(`${indent}${key} <array> ${value.length} 项`)
    value.forEach((item, index) => {
      writeNode(ctx, item, `[${index}]`, indent + INDENT, options, depth + 1)
    })
    return
  }
  if (isPlainObject(value)) {
    ctx.lines.push(`${indent}${key} <object> ${Object.keys(value).length} 项`)
    for (const name of keysOf(value, options.sortKeys)) {
      writeNode(ctx, value[name], name, indent + INDENT, options, depth + 1)
    }
    return
  }
  ctx.lines.push(`${indent}${key} <${typeOf(value)}> ${preview(value)}`)
}

/**
 * 展开成路径列表：每个叶子一行 `$.a[0].b = 值`。
 * 平铺形式方便用编辑器搜索、或当作下游脚本的输入。
 */
function writePath(
  ctx: Ctx,
  value: unknown,
  path: string,
  options: JsonTreeOptions,
  depth: number,
): void {
  if (depth > MAX_DEPTH) throw new JsonTreeError(`JSON 嵌套超过 ${MAX_DEPTH} 层，无法展开`)
  ctx.nodes += 1
  if (ctx.nodes > MAX_NODES) {
    throw new JsonTreeError(`节点数超过 ${MAX_NODES}，路径太多了，请先取子集再查看`)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) ctx.lines.push(`${path} = []`)
    for (const [index, item] of value.entries()) {
      writePath(ctx, item, `${path}[${index}]`, options, depth + 1)
    }
    return
  }
  if (isPlainObject(value)) {
    const keys = keysOf(value, options.sortKeys)
    if (keys.length === 0) ctx.lines.push(`${path} = {}`)
    for (const name of keys) {
      writePath(ctx, value[name], `${path}.${name}`, options, depth + 1)
    }
    return
  }
  ctx.lines.push(`${path} = ${preview(value)}`)
}

/**
 * JSON 转树形文本 —— 纯函数，不依赖 React / DOM。
 *
 * T2 模板只能输出文本，因此「可折叠」退化为缩进层级 + 类型标注：
 * 折叠这一步交给阅读者（编辑器折叠 / 肉眼），工具保证的是结构与类型一眼可见。
 */
export function transform(input: JsonTreeInput, options: JsonTreeOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonTreeError(`输入超过 ${MAX_INPUT} 字符上限`)
  }

  let root: unknown
  try {
    root = JSON.parse(input.text)
  } catch {
    throw new JsonTreeError('不是合法的 JSON')
  }

  const ctx: Ctx = { nodes: 0, lines: [] }
  if (options.mode === 'path') writePath(ctx, root, '$', options, 1)
  else writeNode(ctx, root, '$', '', options, 1)
  return ctx.lines.join('\n')
}
