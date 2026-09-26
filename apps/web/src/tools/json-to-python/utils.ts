import type { JsonToPythonInput, JsonToPythonOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToPythonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToPythonError'
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
  readonly opts: JsonToPythonOptions
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

function className(text: string): string {
  return wordsOf(text).map(upperFirst).join('')
}

function snakeName(text: string): string {
  return wordsOf(text).join('_')
}

const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
  'match',
  'case',
])

function fieldIdent(text: string, index: number, seen: Map<string, number>): string {
  let ident = snakeName(text)
  if (ident === '' || /^[0-9]/.test(ident)) ident = `field_${index + 1}`
  if (PY_KEYWORDS.has(ident)) ident = `${ident}_`
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
      return 'str'
    case 'boolean':
      base = 'bool'
      break
    case 'integer':
      base = 'int'
      break
    case 'number':
      base = 'float'
      break
    case 'null':
      return 'Any'
  }
  return shape.nullable ? `Optional[${base}]` : base
}

function describe(shape: Shape, name: string, ctx: Ctx): string {
  switch (shape.kind) {
    case 'any':
      return 'Any'
    case 'scalar':
      return scalarType(shape)
    case 'array':
      return `List[${describe(shape.element, name, ctx)}]`
    case 'object': {
      const isRoot = !ctx.declaredRoot
      ctx.declaredRoot = true
      return declareClass(shape, isRoot ? ROOT_NAME : name, ctx)
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
      ident: fieldIdent(key, index, seen),
      original: key,
      type: describe(child, className(childName) || 'Nested', ctx),
    }
  })
}

function declareClass(shape: ObjectShape, rawName: string, ctx: Ctx): string {
  const name = uniqueName(className(rawName) || 'Nested', ctx)
  const rows = rowsOf(shape, ctx)
  const { pad, opts } = ctx
  const lines: string[] = []

  if (opts.style === 'dataclass') lines.push('@dataclass')
  const parent =
    opts.style === 'pydantic' ? '(BaseModel)' : opts.style === 'typedict' ? '(TypedDict)' : ''
  lines.push(`class ${name}${parent}:`)
  if (rows.length === 0) {
    lines.push(`${pad}pass`)
  } else {
    for (const row of rows) {
      if (opts.mode === 'snake' && row.ident !== row.original) {
        lines.push(`${pad}# 原 JSON 键: "${row.original}"`)
      }
      lines.push(`${pad}${row.ident}: ${row.type}`)
    }
  }

  ctx.blocks.push(lines.join('\n'))
  return name
}

/** 按目标风格生成文件顶部的 import */
function importsFor(style: JsonToPythonOptions['style']): string {
  if (style === 'dataclass') {
    return 'from dataclasses import dataclass\nfrom typing import Any, List, Optional'
  }
  if (style === 'pydantic') {
    return 'from typing import Any, List, Optional\n\nfrom pydantic import BaseModel'
  }
  return 'from typing import Any, List, Optional, TypedDict'
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
 * JSON 转 Python —— 由样本推断模型类。
 * 空输入返回空串；超长 / 非法输入抛 JsonToPythonError。
 */
export function transform(input: JsonToPythonInput, options: JsonToPythonOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new JsonToPythonError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToPythonError('不是合法的 JSON')
  }
  if (!isSupportedRoot(parsed)) {
    throw new JsonToPythonError('根节点必须是对象或对象数组')
  }

  const pad = options.indent === 'tab' ? '\t' : ' '.repeat(Number.parseInt(options.indent, 10))
  const ctx: Ctx = { opts: options, pad, blocks: [], used: new Map(), declaredRoot: false }
  describe(infer(parsed), ROOT_NAME, ctx)
  if (ctx.blocks.length === 0) return ''
  return `${importsFor(options.style)}\n\n\n${ctx.blocks.join('\n\n\n')}\n`
}
