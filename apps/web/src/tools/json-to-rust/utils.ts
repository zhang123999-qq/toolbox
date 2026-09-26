import type { JsonToRustInput, JsonToRustOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToRustError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToRustError'
  }
}

const MAX_INPUT = 2_000_000
const ROOT_NAME = 'Root'

interface ScalarShape {
  readonly kind: 'scalar'
  readonly type: 'string' | 'boolean' | 'integer' | 'number' | 'null'
  readonly nullable: boolean
}
interface ArrayShape {
  readonly kind: 'array'
  readonly element: Shape
  readonly nullable: boolean
}
interface ObjectShape {
  readonly kind: 'object'
  readonly fields: ReadonlyMap<string, Shape>
  readonly nullable: boolean
}
interface AnyShape {
  readonly kind: 'any'
  readonly nullable: boolean
}
type Shape = ScalarShape | ArrayShape | ObjectShape | AnyShape

interface Ctx {
  readonly opts: JsonToRustOptions
  readonly pad: string
  readonly blocks: string[]
  readonly used: Map<string, number>
  declaredRoot: boolean
}

function anyShape(nullable: boolean): AnyShape {
  return { kind: 'any', nullable }
}

function infer(value: unknown): Shape {
  if (value === null) return { kind: 'scalar', type: 'null', nullable: true }
  if (typeof value === 'string') return { kind: 'scalar', type: 'string', nullable: false }
  if (typeof value === 'boolean') return { kind: 'scalar', type: 'boolean', nullable: false }
  if (typeof value === 'number') {
    return { kind: 'scalar', type: Number.isInteger(value) ? 'integer' : 'number', nullable: false }
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: 'array', element: anyShape(false), nullable: false }
    let element = infer(value[0])
    for (let i = 1; i < value.length; i += 1) element = merge(element, infer(value[i]))
    return { kind: 'array', element, nullable: false }
  }
  const fields = new Map<string, Shape>()
  for (const [key, child] of Object.entries(value as Record<string, unknown>))
    fields.set(key, infer(child))
  return { kind: 'object', fields, nullable: false }
}

function withNullable(shape: Shape): Shape {
  return shape.nullable ? shape : { ...shape, nullable: true }
}

function merge(a: Shape, b: Shape): Shape {
  const nullable = a.nullable || b.nullable
  if (a.kind === 'object' && b.kind === 'object') {
    const fields = new Map<string, Shape>()
    for (const [key, left] of a.fields) {
      const right = b.fields.get(key)
      fields.set(key, right ? merge(left, right) : withNullable(left))
    }
    for (const [key, right] of b.fields) if (!fields.has(key)) fields.set(key, withNullable(right))
    return { kind: 'object', fields, nullable }
  }
  if (a.kind === 'array' && b.kind === 'array') {
    return { kind: 'array', element: merge(a.element, b.element), nullable }
  }
  if (a.kind === 'scalar' && b.kind === 'scalar') {
    if (a.type === 'null' && b.type === 'null') return anyShape(true)
    if (a.type === 'null') return withNullable(b)
    if (b.type === 'null') return withNullable(a)
    if (a.type !== b.type) {
      if (a.type === 'integer' && b.type === 'number')
        return { kind: 'scalar', type: 'number', nullable }
      if (a.type === 'number' && b.type === 'integer')
        return { kind: 'scalar', type: 'number', nullable }
      return anyShape(nullable)
    }
    return { kind: 'scalar', type: a.type, nullable }
  }
  return anyShape(nullable)
}

/** camelCase / kebab / 空格统一切成小写单词 */
function wordsOf(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((token) => token !== '')
    .map((token) => token.toLowerCase())
}

function upperFirst(word: string): string {
  return word === '' ? '' : word.charAt(0).toUpperCase() + word.slice(1)
}

/** 类型名 UpperCamelCase */
function typeName(text: string): string {
  return wordsOf(text).map(upperFirst).join('')
}

/** 字段名 snake_case */
function snakeName(text: string): string {
  return wordsOf(text).join('_')
}

/** Rust 关键字加 r# 前缀 */
const RUST_KEYWORDS = new Set([
  'as',
  'break',
  'const',
  'continue',
  'crate',
  'else',
  'enum',
  'extern',
  'false',
  'fn',
  'for',
  'if',
  'impl',
  'in',
  'let',
  'loop',
  'match',
  'mod',
  'move',
  'mut',
  'pub',
  'ref',
  'return',
  'self',
  'Self',
  'static',
  'struct',
  'super',
  'trait',
  'true',
  'type',
  'unsafe',
  'use',
  'where',
  'while',
  'async',
  'await',
  'dyn',
  'abstract',
  'become',
  'box',
  'do',
  'final',
  'macro',
  'override',
  'priv',
  'typeof',
  'unsized',
  'virtual',
  'yield',
  'try',
])

function rustFieldIdent(text: string, index: number, seen: Map<string, number>): string {
  let ident = snakeName(text)
  if (ident === '' || /^[0-9]/.test(ident)) ident = `field_${index + 1}`
  if (RUST_KEYWORDS.has(ident)) ident = `r#${ident}`
  const count = seen.get(ident) ?? 0
  seen.set(ident, count + 1)
  return count === 0 ? ident : `${ident}_${count + 1}`
}

function singular(text: string): string {
  if (/ies$/i.test(text)) return `${text.slice(0, -3)}y`
  if (/[^s]s$/i.test(text)) return text.slice(0, -1)
  return text
}

function uniqueName(base: string, ctx: Ctx): string {
  const seen = ctx.used.get(base) ?? 0
  ctx.used.set(base, seen + 1)
  return seen === 0 ? base : `${base}${seen + 1}`
}

function scalarType(shape: ScalarShape): string {
  let base: string
  switch (shape.type) {
    case 'string':
      base = 'String'
      break
    case 'boolean':
      base = 'bool'
      break
    case 'integer':
      base = 'i64'
      break
    case 'number':
      base = 'f64'
      break
    case 'null':
      base = 'serde_json::Value'
      break
  }
  return shape.nullable && base !== 'String' && base !== 'serde_json::Value'
    ? `Option<${base}>`
    : base
}

function describe(shape: Shape, name: string, ctx: Ctx): string {
  switch (shape.kind) {
    case 'any':
      return 'serde_json::Value'
    case 'scalar':
      return scalarType(shape)
    case 'array':
      return `Vec<${describe(shape.element, name, ctx)}>`
    case 'object': {
      const isRoot = !ctx.declaredRoot
      ctx.declaredRoot = true
      return declareStruct(shape, isRoot ? ROOT_NAME : name, ctx)
    }
  }
}

interface FieldRow {
  readonly ident: string
  readonly original: string
  readonly type: string
}

function rowsOf(shape: ObjectShape, ctx: Ctx): FieldRow[] {
  const seen = new Map<string, number>()
  return [...shape.fields.entries()].map(([key, child], index) => {
    const childName = child.kind === 'array' ? singular(key) : key
    return {
      ident: rustFieldIdent(key, index, seen),
      original: key,
      type: describe(child, typeName(childName) || 'Nested', ctx),
    }
  })
}

/** 字段的裸标识符（去掉可能的 r# 前缀再比较 JSON 键） */
function bare(ident: string): string {
  return ident.startsWith('r#') ? ident.slice(2) : ident
}

function declareStruct(shape: ObjectShape, rawName: string, ctx: Ctx): string {
  const name = uniqueName(typeName(rawName) || 'Nested', ctx)
  const rows = rowsOf(shape, ctx)
  const { pad, opts } = ctx
  const serde = opts.mode === 'serde'
  const lines: string[] = []

  if (serde) {
    const derives = ['Debug', 'Clone', 'serde::Serialize', 'serde::Deserialize']
    lines.push(`#[derive(${derives.join(', ')})]`)
    if (opts.style === 'snake' && rows.some((row) => bare(row.ident) !== row.original)) {
      lines.push('#[serde(rename_all = "camelCase")]')
    }
  } else {
    lines.push('#[derive(Debug, Clone)]')
  }

  lines.push(`pub struct ${name} {`)
  for (const row of rows) {
    if (serde && opts.style === 'keep' && bare(row.ident) !== row.original) {
      lines.push(`${pad}#[serde(rename = "${row.original.replace(/"/g, '\\"')}")]`)
    }
    lines.push(`${pad}pub ${row.ident}: ${row.type},`)
  }
  lines.push('}')

  ctx.blocks.push(lines.join('\n'))
  return name
}

function isSupportedRoot(value: unknown): boolean {
  if (Array.isArray(value)) {
    return (
      value.length > 0 &&
      value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
    )
  }
  return typeof value === 'object' && value !== null
}

/**
 * JSON 转 Rust —— 由样本推断带 serde 派生的 struct。
 * 空输入返回空串；超长 / 非法输入抛 JsonToRustError。
 */
export function transform(input: JsonToRustInput, options: JsonToRustOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new JsonToRustError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToRustError('不是合法的 JSON')
  }
  if (!isSupportedRoot(parsed)) {
    throw new JsonToRustError('根节点必须是对象或对象数组')
  }

  const pad = options.indent === 'tab' ? '\t' : ' '.repeat(Number.parseInt(options.indent, 10))
  const ctx: Ctx = { opts: options, pad, blocks: [], used: new Map(), declaredRoot: false }
  describe(infer(parsed), ROOT_NAME, ctx)
  return ctx.blocks.length === 0 ? '' : `${ctx.blocks.join('\n\n')}\n`
}
