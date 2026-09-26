import type { SchemaGenInput, SchemaGenOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonSchemaGenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonSchemaGenError'
  }
}

/** 单次处理上限：超过则拒绝，避免超大文本卡死主线程 */
export const MAX_INPUT = 1_000_000

/** 节点上限：样本太大时推断毫无意义，先报警 */
const MAX_NODES = 100_000

/** 缩进档位 */
const PRETTY = 2

/** 两个草案版本的 $schema 声明值 */
const SCHEMA_URI: Record<SchemaGenOptions['format'], string> = {
  'draft-07': 'http://json-schema.org/draft-07/schema#',
  'draft-2020-12': 'https://json-schema.org/draft/2020-12/schema',
}

/** 最终产出的 Schema 片段 */
type Schema = Record<string, unknown>

/**
 * 推断过程中的中间表示。
 *
 * 对象额外维护「见过的全部键」与「每个样本都有的键」两个集合：
 * 单份样本时两者相同，但当样本是对象数组需要合并时，
 * required 该取并集还是交集就由 strict 选项决定。
 */
type Node =
  | { readonly kind: 'scalar'; readonly type: string }
  | {
      readonly kind: 'object'
      readonly properties: Record<string, Node>
      readonly allKeys: ReadonlySet<string>
      readonly commonKeys: ReadonlySet<string>
    }
  | { readonly kind: 'array'; readonly items: Node | null }
  | { readonly kind: 'anyOf'; readonly variants: readonly Node[] }

/** 是否普通对象（排除 null 与数组） */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 标量的类型名：整数单独叫 integer，便于下游区分 int 与 float */
function scalarType(value: null | boolean | number | string): string {
  if (value === null) return 'null'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return typeof value
}

/** 样本签名，用于 anyOf 去重：同一形态的子样本只保留一份变体 */
function signature(node: Node): string {
  return JSON.stringify(toSchema(node, false))
}

/**
 * 合并两个节点的推断结果。
 *
 * 样本来自数组元素时这是例行操作：`[{"a":1},{"b":2}]` 应当推出
 * 同时含 a、b 两个属性的对象，而不是二选一。
 */
function merge(a: Node, b: Node): Node {
  if (a.kind === 'object' && b.kind === 'object') {
    const allKeys = new Set([...a.allKeys, ...b.allKeys])
    // 只在两边都出现过的键才算「每个样本都有」
    const commonKeys = new Set([...a.commonKeys].filter((key) => b.commonKeys.has(key)))
    const properties: Record<string, Node> = {}
    for (const key of allKeys) {
      const left = a.properties[key]
      const right = b.properties[key]
      if (left && right) properties[key] = merge(left, right)
      else properties[key] = (left ?? right) as Node
    }
    return { kind: 'object', properties, allKeys, commonKeys }
  }
  if (a.kind === 'array' && b.kind === 'array') {
    if (a.items === null || b.items === null) return { kind: 'array', items: null }
    return { kind: 'array', items: merge(a.items, b.items) }
  }
  if (a.kind === 'scalar' && b.kind === 'scalar') {
    return a.type === b.type ? a : { kind: 'anyOf', variants: [a, b] }
  }
  const variants: Node[] = []
  const seen = new Set<string>()
  const flat = a.kind === 'anyOf' ? a.variants : [a]
  const other = b.kind === 'anyOf' ? b.variants : [b]
  for (const node of [...flat, ...other]) {
    const key = signature(node)
    if (seen.has(key)) continue
    seen.add(key)
    variants.push(node)
  }
  return { kind: 'anyOf', variants }
}

/** 把节点转写成 Schema 片段；strict 只影响 required 的取法 */
function toSchema(node: Node, strict: boolean): Schema {
  switch (node.kind) {
    case 'scalar':
      return { type: node.type }
    case 'array':
      return node.items === null
        ? { type: 'array' }
        : { type: 'array', items: toSchema(node.items, strict) }
    case 'anyOf':
      return { anyOf: node.variants.map((variant) => toSchema(variant, strict)) }
    case 'object': {
      const properties: Record<string, Schema> = {}
      for (const key of Object.keys(node.properties)) {
        properties[key] = toSchema(node.properties[key], strict)
      }
      const required = [...(strict ? node.allKeys : node.commonKeys)].sort()
      return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
        additionalProperties: false,
      }
    }
  }
}

/**
 * 从样本反推 Schema —— 纯函数，不依赖 React / DOM。
 *
 * 推断只能给出「这份样本可能长什么样」的下界：样本里没出现的可选字段、
 * 取值范围、字符串 format 都无从得知，产物需要人工补一轮。
 */
export function transform(input: SchemaGenInput, options: SchemaGenOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonSchemaGenError(`输入超过 ${MAX_INPUT} 字符上限`)
  }

  let root: unknown
  try {
    root = JSON.parse(input.text)
  } catch {
    throw new JsonSchemaGenError('不是合法的 JSON')
  }

  let budget = MAX_NODES
  function infer(value: unknown): Node {
    budget -= 1
    if (budget < 0) {
      throw new JsonSchemaGenError(`结构超过 ${MAX_NODES} 个节点，请先取子集样本`)
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return { kind: 'array', items: null }
      let items = infer(value[0])
      for (const rest of value.slice(1)) items = merge(items, infer(rest))
      return { kind: 'array', items }
    }
    if (isPlainObject(value)) {
      const properties: Record<string, Node> = {}
      for (const key of Object.keys(value)) properties[key] = infer(value[key])
      const keys = new Set(Object.keys(value))
      return { kind: 'object', properties, allKeys: keys, commonKeys: new Set(keys) }
    }
    return { kind: 'scalar', type: scalarType(value as null | boolean | number | string) }
  }

  const schema: Schema = {
    $schema: SCHEMA_URI[options.format],
    ...toSchema(infer(root), options.strict),
  }
  return JSON.stringify(schema, null, PRETTY)
}
