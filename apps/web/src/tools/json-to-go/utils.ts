import type { JsonToGoInput, JsonToGoOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToGoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToGoError'
  }
}

const MAX_INPUT = 2_000_000
/** 样本没有外层名字可用，根结构体统一叫 Root */
const ROOT_NAME = 'Root'

interface ScalarShape {
  readonly kind: 'scalar'
  readonly type: 'string' | 'number' | 'boolean' | 'null'
  /** 数值是否全是整数，决定映射 int 还是 float64 */
  readonly integral: boolean
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
/** 标量多种推断结果不一致时退化为 interface{} */
interface AnyShape {
  readonly kind: 'any'
  readonly nullable: boolean
}
type Shape = ScalarShape | ArrayShape | ObjectShape | AnyShape

interface Ctx {
  readonly opts: JsonToGoOptions
  readonly pad: string
  readonly blocks: string[]
  readonly used: Map<string, number>
  /** 顶层结构体必须先有名字，否则 inline 模式下会一个 type 都输出不了 */
  declaredRoot: boolean
}

/** 无法推断元素类型时的占位，Go 里对应 interface{} */
function anyShape(nullable: boolean): AnyShape {
  return { kind: 'any', nullable }
}

/**
 * 推断样本的形状树。
 * 数组会把所有元素合并成一份 Shape，缺失的键标为 nullable —— Go 侧表现为指针类型，
 * 这样 nil 与零值才能区分开。
 */
function infer(value: unknown): Shape {
  if (value === null) return { kind: 'scalar', type: 'null', integral: true, nullable: true }
  if (typeof value === 'string') {
    return { kind: 'scalar', type: 'string', integral: true, nullable: false }
  }
  if (typeof value === 'number') {
    return {
      kind: 'scalar',
      type: 'number',
      integral: Number.isInteger(value),
      nullable: false,
    }
  }
  if (typeof value === 'boolean') {
    return { kind: 'scalar', type: 'boolean', integral: true, nullable: false }
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: 'array', element: anyShape(false), nullable: false }
    let element = infer(value[0])
    for (let i = 1; i < value.length; i += 1) element = merge(element, infer(value[i]))
    return { kind: 'array', element, nullable: false }
  }
  const fields = new Map<string, Shape>()
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    fields.set(key, infer(child))
  }
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
    for (const [key, right] of b.fields) {
      if (!fields.has(key)) fields.set(key, withNullable(right))
    }
    return { kind: 'object', fields, nullable }
  }

  if (a.kind === 'array' && b.kind === 'array') {
    return { kind: 'array', element: merge(a.element, b.element), nullable }
  }

  if (a.kind === 'scalar' && b.kind === 'scalar') {
    if (a.type === 'null' && b.type === 'null') return anyShape(true)
    if (a.type === 'null') return withNullable(b)
    if (b.type === 'null') return withNullable(a)
    if (a.type !== b.type) return anyShape(nullable)
    const integral = a.type === 'number' ? a.integral && b.integral : true
    return { kind: 'scalar', type: a.type, integral, nullable }
  }

  if (a.kind === 'any' || b.kind === 'any') return anyShape(nullable)

  // 对象与数组混排无法用一个 Go 类型表达，退化为 interface{}（README「限制」已写明）
  return anyShape(nullable)
}

/** 切成小写单词序列：与命名转换工具同一套切分口径 */
function tokenize(text: string): string[] {
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

function pascal(text: string): string {
  return tokenize(text).map(upperFirst).join('')
}

/** 数组元素类型的名字取单数形式：users → User */
function singular(text: string): string {
  if (/ies$/i.test(text)) return `${text.slice(0, -3)}y`
  if (/[^s]s$/i.test(text)) return text.slice(0, -1)
  return text
}

function indentUnit(indent: JsonToGoOptions['indent']): string {
  if (indent === 'tab') return '\t'
  return ' '.repeat(Number.parseInt(indent, 10))
}

function uniqueName(base: string, ctx: Ctx): string {
  const seen = ctx.used.get(base) ?? 0
  ctx.used.set(base, seen + 1)
  return seen === 0 ? base : `${base}${seen + 1}`
}

/** Go 只有首字母大写的字段才会被 encoding/json 处理，因此字段一律转导出名 */
function exportedName(key: string, index: number, seen: Map<string, number>): string {
  const candidate = pascal(key)
  const base = candidate === '' ? `Field${index + 1}` : candidate
  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}${count + 1}`
}

function tagOf(key: string, ctx: Ctx): string {
  const suffix = ctx.opts.style === 'omitempty' ? ',omitempty' : ''
  return `\`json:"${key}${suffix}"\``
}

interface Row {
  readonly name: string
  readonly type: string
  readonly tag: string
}

function rowsOf(shape: ObjectShape, ctx: Ctx, rowLevel: number): Row[] {
  const seen = new Map<string, number>()
  return [...shape.fields.entries()].map(([key, child], index) => {
    const childName = child.kind === 'array' ? singular(key) : key
    return {
      name: exportedName(key, index, seen),
      type: describe(child, childName, ctx, rowLevel),
      tag: tagOf(key, ctx),
    }
  })
}

/**
 * 列宽只统计单行类型：内联结构体的类型是多行文本，
 * 把它算进宽度会让编号错位到下一个 Field 处。
 */
function columnWidth(rows: readonly Row[], pick: (row: Row) => string): number {
  return rows.reduce((max, row) => {
    const text = pick(row)
    return text.includes('\n') ? max : Math.max(max, text.length)
  }, 0)
}

function describe(shape: Shape, name: string, ctx: Ctx, depth: number): string {
  const pointers = (text: string): string => (shape.nullable ? `*${text}` : text)
  switch (shape.kind) {
    case 'any':
      return pointers('interface{}')
    case 'scalar': {
      if (shape.type === 'null') return 'interface{}'
      if (shape.type === 'string') return pointers('string')
      if (shape.type === 'boolean') return pointers('bool')
      return pointers(shape.integral ? 'int' : 'float64')
    }
    case 'array':
      // 数组只是类型前缀（[]T），元素结构体与该字段处在同一缩进层，不额外加层级
      return pointers(`[]${describe(shape.element, name, ctx, depth)}`)
    case 'object': {
      // 先占位再渲染子字段：否则子结构体也会被当成根节点各自声明出去
      const isRoot = !ctx.declaredRoot
      ctx.declaredRoot = true
      const container =
        !isRoot && ctx.opts.mode === 'inline'
          ? inlineStruct(shape, ctx, depth)
          : declareStruct(shape, name, ctx)
      return pointers(container)
    }
  }
}

/** 拆成独立的命名结构体：被引用者先声明，避免 Go 侧「未定义类型」 */
function declareStruct(shape: ObjectShape, rawName: string, ctx: Ctx): string {
  const name = uniqueName(pascal(rawName) || 'Nested', ctx)
  // 结构体字段一律从第 1 缩进层开始；rowLevel 会作为 inline 子结构体的字段层级
  const rows = rowsOf(shape, ctx, 1)
  const nameWidth = columnWidth(rows, (row) => row.name)
  const typeWidth = columnWidth(rows, (row) => row.type)
  const lines = [`type ${name} struct {`]
  for (const row of rows) {
    lines.push(`${ctx.pad}${row.name.padEnd(nameWidth)} ${row.type.padEnd(typeWidth)} ${row.tag}`)
  }
  lines.push('}')
  ctx.blocks.push(lines.join('\n'))
  return name
}

/** 内联匿名结构体：深度决定内部缩进，闭合括号回到调用处所在的层级 */
function inlineStruct(shape: ObjectShape, ctx: Ctx, depth: number): string {
  const rows = rowsOf(shape, ctx, depth + 1)
  const nameWidth = columnWidth(rows, (row) => row.name)
  const typeWidth = columnWidth(rows, (row) => row.type)
  const bodyPad = ctx.pad.repeat(depth + 1)
  const lines = ['struct {']
  for (const row of rows) {
    lines.push(`${bodyPad}${row.name.padEnd(nameWidth)} ${row.type.padEnd(typeWidth)} ${row.tag}`)
  }
  lines.push(`${ctx.pad.repeat(depth)}}`)
  return lines.join('\n')
}

/** 根节点必须是对象或对象数组：标量样本推不出结构体 */
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
 * JSON 转 Go —— 由样本推断结构体定义。
 * 空输入返回空串；超长与非法输入抛 JsonToGoError（中文提示，UI 直接展示）。
 */
export function transform(input: JsonToGoInput, options: JsonToGoOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonToGoError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToGoError('不是合法的 JSON')
  }

  if (!isSupportedRoot(parsed)) {
    throw new JsonToGoError('根节点必须是对象或对象数组')
  }

  const ctx: Ctx = {
    opts: options,
    pad: indentUnit(options.indent),
    blocks: [],
    used: new Map<string, number>(),
    declaredRoot: false,
  }
  describe(infer(parsed), ROOT_NAME, ctx, 0)
  return ctx.blocks.length === 0 ? '' : `${ctx.blocks.join('\n\n')}\n`
}
