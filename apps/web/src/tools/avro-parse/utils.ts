import type { AvroParseInput, AvroParseOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class AvroParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AvroParseError'
  }
}

const MAX_INPUT = 200_000
/** 嵌套上限：命名类型可以互相引用，展开时必须有环检测 */
const MAX_DEPTH = 32

/** Avro 的 8 个原生类型 */
const PRIMITIVES: readonly string[] = [
  'null',
  'boolean',
  'int',
  'long',
  'float',
  'double',
  'bytes',
  'string',
]

/** 复合类型关键字 */
const COMPLEX: readonly string[] = ['record', 'enum', 'array', 'map', 'fixed', 'error']

type Json = null | boolean | number | string | Json[] | { readonly [key: string]: Json }

/** 解析出的一个节点：label 是展示文案，children 是子类型 */
export interface AvroNode {
  readonly kind:
    'primitive' | 'record' | 'enum' | 'array' | 'map' | 'fixed' | 'union' | 'ref' | 'unknown'
  readonly label: string
  readonly children: readonly AvroNode[]
}

export interface AvroStats {
  readonly counts: Record<string, number>
  readonly fields: number
  readonly depth: number
  readonly namedTypes: readonly string[]
}

export interface AvroAnalysis {
  readonly root: AvroNode
  readonly stats: AvroStats
  readonly warnings: readonly string[]
}

interface Context {
  /** 全名 → 定义，供命名引用解析 */
  readonly named: Map<string, Json>
  readonly counts: Record<string, number>
  readonly warnings: string[]
  fields: number
  maxDepth: number
}

function isObject(value: unknown): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function count(ctx: Context, key: string): void {
  ctx.counts[key] = (ctx.counts[key] ?? 0) + 1
}

/**
 * 注册命名类型（record / enum / fixed）。
 * Avro 的 namespace 会向下继承：子类型没写 namespace 就用父级的，
 * 名字里已带点的则视为全名，不再拼 namespace。
 */
function fullName(raw: string, namespace: string): string {
  if (raw.includes('.')) return raw
  return namespace ? `${namespace}.${raw}` : raw
}

function registerNamed(node: Record<string, Json>, namespace: string, ctx: Context): string {
  const name = node['name']
  if (typeof name !== 'string' || name === '') {
    throw new AvroParseError('命名类型（record / enum / fixed）缺少 name')
  }
  const own = typeof node['namespace'] === 'string' ? (node['namespace'] as string) : namespace
  const full = fullName(name, own)
  if (ctx.named.has(full)) {
    ctx.warnings.push(`命名类型 ${full} 重复定义，后出现的被忽略`)
  } else {
    ctx.named.set(full, node as Json)
  }
  return own
}

/** 解析一个类型节点 */
function parseNode(node: unknown, namespace: string, ctx: Context, depth: number): AvroNode {
  if (depth > MAX_DEPTH) throw new AvroParseError('嵌套层级过深（上限 32 层）')
  ctx.maxDepth = Math.max(ctx.maxDepth, depth)

  if (Array.isArray(node)) {
    count(ctx, 'union')
    const children = node.map((item) => parseNode(item, namespace, ctx, depth + 1))
    return { kind: 'union', label: `union（${children.length} 个分支）`, children }
  }

  if (typeof node === 'string') {
    if (PRIMITIVES.includes(node)) {
      count(ctx, node)
      return { kind: 'primitive', label: node, children: [] }
    }
    // 命名类型引用
    const full = fullName(node, namespace)
    if (!ctx.named.has(full)) {
      ctx.warnings.push(`引用了未定义的命名类型：${node}（展开时按未知对象处理）`)
    }
    count(ctx, 'ref')
    return {
      kind: 'ref',
      label: `${node}${ctx.named.has(full) && node !== full ? ` → ${full}` : ''}`,
      children: [],
    }
  }

  if (isObject(node)) {
    const type = node['type']
    if (typeof type === 'string' && COMPLEX.includes(type)) {
      return parseComplex(type, node, namespace, ctx, depth)
    }
    if (typeof type === 'string' && PRIMITIVES.includes(type)) {
      count(ctx, type)
      const logical = typeof node['logicalType'] === 'string' ? `（${node['logicalType']}）` : ''
      return { kind: 'primitive', label: `${type}${logical}`, children: [] }
    }
    if (type === undefined) {
      throw new AvroParseError('Schema 节点缺少 type 字段')
    }
    count(ctx, 'unknown')
    return { kind: 'unknown', label: `未知类型 ${JSON.stringify(type)}`, children: [] }
  }

  throw new AvroParseError(`无法识别的 Schema 节点：${JSON.stringify(node)}`)
}

function parseComplex(
  kind: string,
  node: Record<string, Json>,
  namespace: string,
  ctx: Context,
  depth: number,
): AvroNode {
  if (kind === 'record' || kind === 'error') {
    const own = registerNamed(node, namespace, ctx)
    const name = String(node['name'])
    count(ctx, kind)
    const fields = node['fields']
    if (!Array.isArray(fields)) throw new AvroParseError(`record ${name} 的 fields 必须是数组`)
    const children: AvroNode[] = fields.map((field) => {
      if (!isObject(field)) throw new AvroParseError(`record ${name} 的字段必须是对象`)
      const fieldName = field['name']
      if (typeof fieldName !== 'string') throw new AvroParseError(`record ${name} 有字段缺少 name`)
      ctx.fields += 1
      const child = parseNode(field['type'], own, ctx, depth + 1)
      const doc = typeof field['doc'] === 'string' ? ` // ${field['doc']}` : ''
      return { ...child, label: `${fieldName}: ${child.label}${doc}` }
    })
    return { kind: 'record', label: `${fullName(name, own)} (${kind})`, children }
  }

  if (kind === 'enum') {
    const own = registerNamed(node, namespace, ctx)
    const symbols = node['symbols']
    if (!Array.isArray(symbols))
      throw new AvroParseError(`enum ${String(node['name'])} 的 symbols 必须是数组`)
    count(ctx, 'enum')
    return {
      kind: 'enum',
      label: `${fullName(String(node['name']), own)} (enum: ${symbols.length} 个符号)`,
      children: symbols.map((symbol) => ({
        kind: 'primitive' as const,
        label: String(symbol),
        children: [],
      })),
    }
  }

  if (kind === 'fixed') {
    const own = registerNamed(node, namespace, ctx)
    const size = node['size']
    if (typeof size !== 'number')
      throw new AvroParseError(`fixed ${String(node['name'])} 的 size 必须是数字`)
    count(ctx, 'fixed')
    return {
      kind: 'fixed',
      label: `${fullName(String(node['name']), own)} (fixed, ${size} 字节)`,
      children: [],
    }
  }

  if (kind === 'array') {
    count(ctx, 'array')
    const child = parseNode(node['items'], namespace, ctx, depth + 1)
    return { kind: 'array', label: `array<${child.label}>`, children: [child] }
  }

  // map
  count(ctx, 'map')
  const child = parseNode(node['values'], namespace, ctx, depth + 1)
  return { kind: 'map', label: `map<string, ${child.label}>`, children: [child] }
}

/** 解析 Avro Schema；结构非法抛 AvroParseError */
export function analyze(schema: unknown): AvroAnalysis {
  if (schema === null || typeof schema !== 'object') {
    throw new AvroParseError('Avro Schema 必须是对象或数组（union）')
  }
  const ctx: Context = {
    named: new Map(),
    counts: {},
    warnings: [],
    fields: 0,
    maxDepth: 0,
  }
  const root = parseNode(schema as Json, '', ctx, 0)
  return {
    root,
    stats: {
      counts: ctx.counts,
      fields: ctx.fields,
      depth: ctx.maxDepth,
      namedTypes: [...ctx.named.keys()],
    },
    warnings: ctx.warnings,
  }
}

/** 字段树渲染：用 ├─ / └─ 画层级 */
export function renderTree(node: AvroNode): string {
  const lines: string[] = []
  walk(node, '', true, lines)
  return lines.join('\n')
}

function walk(node: AvroNode, prefix: string, isRoot: boolean, out: string[]): void {
  out.push(isRoot ? node.label : prefix + node.label)
  const childPrefix = isRoot ? '' : prefix.replace(/[├└]─ /, '')
  const pad = isRoot ? '' : childPrefix.replace(/[│]/g, ' ')
  node.children.forEach((child, index) => {
    const last = index === node.children.length - 1
    const branch = last ? '└─ ' : '├─ '
    const nextPrefix = isRoot ? branch : pad.replace(/.$/, last ? ' ' : '│') + ' ' + branch
    walk(child, nextPrefix, false, out)
  })
}

// ---------------------------------------------------------------------------
// JSON Schema 粗略映射
// ---------------------------------------------------------------------------

/** Avro 原生类型 → JSON Schema 类型 */
const PRIMITIVE_MAP: Record<string, Json> = {
  null: { type: 'null' },
  boolean: { type: 'boolean' },
  int: { type: 'integer' },
  long: { type: 'integer' },
  float: { type: 'number' },
  double: { type: 'number' },
  bytes: { type: 'string' },
  string: { type: 'string' },
}

/** 把 Avro 类型映射成 JSON Schema（粗略，见 README「限制」） */
export function toJsonSchema(
  node: unknown,
  namespace: string,
  named: Map<string, Json>,
  seen: readonly string[] = [],
): Json {
  if (Array.isArray(node)) {
    return { anyOf: node.map((item) => toJsonSchema(item, namespace, named, seen)) }
  }
  if (typeof node === 'string') {
    if (PRIMITIVE_MAP[node]) return PRIMITIVE_MAP[node] as Json
    const full = fullName(node, namespace)
    const definition = named.get(full)
    if (definition) {
      if (seen.includes(full)) return { $comment: `递归引用 ${full}（已截断）` }
      return toJsonSchema(definition, full.slice(0, full.lastIndexOf('.')), named, [...seen, full])
    }
    return { $comment: `未定义的命名类型 ${node}（按任意对象处理）`, type: 'object' }
  }
  if (!isObject(node)) return {}

  const type = node['type']
  if (typeof type === 'string' && PRIMITIVE_MAP[type]) {
    const base = PRIMITIVE_MAP[type] as Record<string, Json>
    const logical = node['logicalType']
    if (typeof logical === 'string') {
      return { ...base, $comment: `Avro logicalType: ${logical}` }
    }
    return base
  }

  if (type === 'record' || type === 'error') {
    const own = typeof node['namespace'] === 'string' ? String(node['namespace']) : namespace
    const name = String(node['name'] ?? '')
    const file = fullName(name, own)
    if (seen.includes(file)) return { $comment: `递归引用 ${file}（已截断）` }
    const nextSeen = [...seen, file]
    const properties: Record<string, Json> = {}
    const required: string[] = []
    const fields = Array.isArray(node['fields']) ? (node['fields'] as Json[]) : []
    for (const field of fields) {
      if (!isObject(field)) continue
      const fieldName = String(field['name'] ?? '')
      properties[fieldName] = toJsonSchema(field['type'], own, named, nextSeen)
      if (!isNullable(field['type'])) required.push(fieldName)
    }
    return { type: 'object', title: file, properties, required }
  }

  if (type === 'enum') {
    return {
      type: 'string',
      enum: Array.isArray(node['symbols']) ? (node['symbols'] as Json[]) : [],
    }
  }

  if (type === 'fixed') {
    return { type: 'string', $comment: `Avro fixed，长度 ${String(node['size'] ?? '?')} 字节` }
  }

  if (type === 'array') {
    return { type: 'array', items: toJsonSchema(node['items'], namespace, named, seen) }
  }

  if (type === 'map') {
    return {
      type: 'object',
      additionalProperties: toJsonSchema(node['values'], namespace, named, seen),
    }
  }

  return { $comment: `未识别的类型 ${JSON.stringify(type)}` }
}

/** 类型是否可空：union 里含 null 即视为可空 */
export function isNullable(node: unknown): boolean {
  if (Array.isArray(node)) return node.some((item) => item === 'null' || isNullableRecord(item))
  return node === 'null' || isNullableRecord(node)
}

function isNullableRecord(node: unknown): boolean {
  return isObject(node) && node['type'] === 'null'
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

function renderStats(stats: AvroStats): string {
  const rows = Object.entries(stats.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `  ${name}: ${count}`)
  return [
    ...rows,
    `  字段总数: ${stats.fields}`,
    `  嵌套深度: ${stats.depth}`,
    `  命名类型: ${stats.namedTypes.length ? stats.namedTypes.join('、') : '（无）'}`,
  ].join('\n')
}

/**
 * Avro Schema → 字段树 / 类型统计 / JSON Schema 映射（纯函数）。
 * 只做结构解析与校验，不做二进制序列化（Avro 的二进制编码不在本工具范围内）。
 */
export function transform(input: AvroParseInput, options: AvroParseOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new AvroParseError('输入超过 200,000 字符上限')

  let schema: unknown
  try {
    schema = JSON.parse(input.text)
  } catch {
    throw new AvroParseError('不是合法的 JSON（Avro Schema 用 JSON 描述）')
  }

  const { root, stats, warnings } = analyze(schema)
  const blocks: string[] = []

  if (options.mode !== 'jsonSchema') {
    blocks.push(
      ['# Avro Schema 字段树', renderTree(root), '', '类型统计：', renderStats(stats)].join('\n'),
    )
  }

  if (options.mode !== 'tree') {
    const named = new Map<string, Json>()
    collectNamed(schema as Json, '', named)
    const mapped = toJsonSchema(schema, '', named)
    const indent = options.indent === '4' ? 4 : 2
    const withMeta: Json = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      ...(mapped as Record<string, Json>),
    }
    blocks.push(['# JSON Schema 粗略映射', JSON.stringify(withMeta, null, indent)].join('\n'))
  }

  const head = warnings.length
    ? [...new Set(warnings)].map((w) => `# ${w}`).join('\n') + '\n\n'
    : ''
  return head + blocks.join('\n\n')
}

/** 收集所有命名类型，供 JSON Schema 映射时解析引用 */
function collectNamed(node: Json, namespace: string, out: Map<string, Json>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectNamed(item, namespace, out)
    return
  }
  if (!isObject(node)) return
  const type = node['type']
  if (type === 'record' || type === 'error' || type === 'enum' || type === 'fixed') {
    const own = typeof node['namespace'] === 'string' ? String(node['namespace']) : namespace
    const name = String(node['name'] ?? '')
    if (name && !out.has(fullName(name, own))) out.set(fullName(name, own), node)
    if (type === 'record' || type === 'error') {
      const fields = Array.isArray(node['fields']) ? (node['fields'] as Json[]) : []
      for (const field of fields) {
        if (isObject(field)) collectNamed(field['type'] as Json, own, out)
      }
    }
    return
  }
  if (type === 'array') {
    collectNamed(node['items'] as Json, namespace, out)
    return
  }
  if (type === 'map') {
    collectNamed(node['values'] as Json, namespace, out)
  }
}
