import type { JsonToJavaInput, JsonToJavaOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToJavaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToJavaError'
  }
}

const MAX_INPUT = 2_000_000
/** 根样本没有外层名字，统一叫 Root */
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
  readonly opts: JsonToJavaOptions
  readonly pad: string
  readonly blocks: string[]
  readonly used: Map<string, number>
  declaredRoot: boolean
}

function anyShape(nullable: boolean): AnyShape {
  return { kind: 'any', nullable }
}

/** 由样本推断形状树；数组元素合并成一份 Shape，缺失键标为 nullable */
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
      // 整数 / 浮点合并按浮点处理；其余不一致退化为 Object
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

/** 切成小写单词 */
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

/** 类名：PascalCase */
function pascal(text: string): string {
  return tokenize(text).map(upperFirst).join('')
}

/** 字段名：camelCase */
function camel(text: string, index: number, seen: Map<string, number>): string {
  const words = tokenize(text)
  const candidate =
    words.length === 0
      ? `field${index + 1}`
      : words[0] +
        words
          .slice(1)
          .map((word) => upperFirst(word))
          .join('')
  const count = seen.get(candidate) ?? 0
  seen.set(candidate, count + 1)
  return count === 0 ? candidate : `${candidate}${count + 1}`
}

/** 数组元素类型名单数化：users → User */
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

/** 标量 → Java 类型；可空的基本类型改成包装类，以便区分 null 与零值 */
function scalarType(shape: ScalarShape): string {
  let base: string
  switch (shape.type) {
    case 'string':
      return 'String'
    case 'boolean':
      base = 'boolean'
      break
    case 'integer':
      base = 'long'
      break
    case 'number':
      base = 'double'
      break
    case 'null':
      return 'Object'
  }
  if (shape.nullable) {
    if (base === 'boolean') return 'Boolean'
    if (base === 'long') return 'Long'
    if (base === 'double') return 'Double'
  }
  return base
}

function describe(shape: Shape, name: string, ctx: Ctx): string {
  switch (shape.kind) {
    case 'any':
      return 'Object'
    case 'scalar':
      return scalarType(shape)
    case 'array':
      return `${describe(shape.element, name, ctx)}[]`
    case 'object': {
      const isRoot = !ctx.declaredRoot
      ctx.declaredRoot = true
      return declareClass(shape, isRoot ? ROOT_NAME : name, ctx)
    }
  }
}

interface Row {
  readonly name: string
  readonly type: string
}

function rowsOf(shape: ObjectShape, ctx: Ctx): Row[] {
  const seen = new Map<string, number>()
  return [...shape.fields.entries()].map(([key, child], index) => {
    const childName = child.kind === 'array' ? singular(key) : key
    return {
      name: camel(key, index, seen),
      type: describe(child, pascal(childName) || 'Nested', ctx),
    }
  })
}

/** 组装一个类 / record；被引用的子类会在 rowsOf 里先压入 blocks */
function declareClass(shape: ObjectShape, rawName: string, ctx: Ctx): string {
  const name = uniqueName(pascal(rawName) || 'Nested', ctx)
  const rows = rowsOf(shape, ctx)
  const visibility = ctx.opts.mode === 'public' ? 'public ' : ''
  const { pad } = ctx
  const lines: string[] = []

  if (ctx.opts.style === 'record') {
    const components = rows.map((row) => `${row.type} ${row.name}`).join(', ')
    lines.push(`${visibility}record ${name}(${components}) {}`)
  } else {
    if (ctx.opts.style === 'lombok') lines.push('@Data')
    lines.push(`${visibility}class ${name} {`)
    for (const row of rows) lines.push(`${pad}private ${row.type} ${row.name};`)
    if (ctx.opts.style === 'pojo') {
      for (const row of rows) {
        const accessor = upperFirst(row.name)
        lines.push('')
        lines.push(`${pad}public ${row.type} get${accessor}() {`)
        lines.push(`${pad}${pad}return ${row.name};`)
        lines.push(`${pad}}`)
        lines.push('')
        lines.push(`${pad}public void set${accessor}(${row.type} ${row.name}) {`)
        lines.push(`${pad}${pad}this.${row.name} = ${row.name};`)
        lines.push(`${pad}}`)
      }
    }
    lines.push('}')
  }

  ctx.blocks.push(lines.join('\n'))
  return name
}

/** 根节点必须是对象或元素全为对象的非空数组 */
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
 * JSON 转 Java —— 由样本推断类定义。
 * 空输入返回空串；超长 / 非法输入抛 JsonToJavaError（中文提示，UI 直接展示）。
 */
export function transform(input: JsonToJavaInput, options: JsonToJavaOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new JsonToJavaError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToJavaError('不是合法的 JSON')
  }
  if (!isSupportedRoot(parsed)) {
    throw new JsonToJavaError('根节点必须是对象或对象数组')
  }

  const pad = options.indent === 'tab' ? '\t' : ' '.repeat(Number.parseInt(options.indent, 10))
  const ctx: Ctx = { opts: options, pad, blocks: [], used: new Map(), declaredRoot: false }
  describe(infer(parsed), ROOT_NAME, ctx)
  return ctx.blocks.length === 0 ? '' : `${ctx.blocks.join('\n\n')}\n`
}
