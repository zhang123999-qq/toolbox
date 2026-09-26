import type { JsonToTsInput, JsonToTsOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToTsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToTsError'
  }
}

const MAX_INPUT = 2_000_000
/** 样本没有外层名字可用，根类型统一叫 Root */
const ROOT_NAME = 'Root'

interface ScalarShape {
  readonly kind: 'scalar'
  readonly type: 'string' | 'number' | 'boolean' | 'null'
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
/** 标量多次推断结果不一致时合并成的联合类型；`unknown` 也用 kinds 表示 */
interface UnionShape {
  readonly kind: 'union'
  readonly types: readonly string[]
  readonly nullable: boolean
}
type Shape = ScalarShape | ArrayShape | ObjectShape | UnionShape

interface Ctx {
  readonly opts: JsonToTsOptions
  /** 一级缩进串，随 indent 选项变化 */
  readonly pad: string
  /** 已完成的声明块，子类型先入，保证被引用者先定义 */
  readonly blocks: string[]
  readonly used: Map<string, number>
}

/** 无法推断元素类型时的占位 */
function unknownShape(): UnionShape {
  return { kind: 'union', types: ['unknown'], nullable: false }
}

/**
 * 推断样本的形状树。
 * 数组会把所有元素合并成一份 Shape，缺失的键保留为 nullable —— 否则一条脏数据就会让整份类型不可用。
 */
function infer(value: unknown): Shape {
  if (value === null) return { kind: 'scalar', type: 'null', nullable: true }
  if (typeof value === 'string') return { kind: 'scalar', type: 'string', nullable: false }
  if (typeof value === 'number') return { kind: 'scalar', type: 'number', nullable: false }
  if (typeof value === 'boolean') return { kind: 'scalar', type: 'boolean', nullable: false }
  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: 'array', element: unknownShape(), nullable: false }
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

/** 标量 / 联合类型参与合并时取出的 TS 类型名列表（纯 null 记为 0 个，交给 nullable 表达） */
function typeNames(shape: Shape): readonly string[] {
  if (shape.kind === 'scalar') return shape.type === 'null' ? [] : [shape.type]
  if (shape.kind === 'union') return shape.types
  return []
}

function merge(a: Shape, b: Shape): Shape {
  const nullable = a.nullable || b.nullable

  if (a.kind === 'object' && b.kind === 'object') {
    // 两边各自的缺失键都要标成可空：否则拼出来的类型会漏掉样本里本来存在的字段可能为 null
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

  if (isScalarLike(a) || isScalarLike(b)) {
    const left = typeNames(a)
    const right = typeNames(b)
    if (left.includes('unknown') || right.includes('unknown')) return unknownShape()
    const types = [...left, ...right].filter((type, index, all) => all.indexOf(type) === index)
    if (types.length === 0) return { kind: 'scalar', type: 'null', nullable: true }
    return { kind: 'union', types, nullable }
  }

  // 对象与数组、对象与标量无法用同一个 TS 类型表达，退化为 unknown（README「限制」已写明）
  return unknownShape()
}

function isScalarLike(shape: Shape): boolean {
  return shape.kind === 'scalar' || shape.kind === 'union'
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

function indentUnit(indent: JsonToTsOptions['indent']): string {
  if (indent === 'tab') return '\t'
  return ' '.repeat(Number.parseInt(indent, 10))
}

function uniqueName(base: string, ctx: Ctx): string {
  const seen = ctx.used.get(base) ?? 0
  ctx.used.set(base, seen + 1)
  return seen === 0 ? base : `${base}${seen + 1}`
}

/** 可空字段在非严格模式下写成可选属性 */
function decorate(base: string, nullable: boolean): string {
  if (!nullable || base === 'null' || base === 'unknown') return base
  return `${base} | null`
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function describe(shape: Shape, name: string, ctx: Ctx): string {
  switch (shape.kind) {
    case 'scalar':
      return decorate(shape.type, shape.nullable)
    case 'union':
      return decorate(shape.types.join(' | '), shape.nullable)
    case 'array': {
      const inner = describe(shape.element, name, ctx)
      // 联合类型要加括号，否则 `number | string[]` 会被解析成完全不同的类型
      const element = inner.includes(' | ') ? `(${inner})` : inner
      return decorate(`${element}[]`, shape.nullable)
    }
    case 'object':
      return decorate(declareObject(shape, name, ctx), shape.nullable)
  }
}

function declareObject(shape: ObjectShape, rawName: string, ctx: Ctx): string {
  const name = uniqueName(pascal(rawName) || 'Nested', ctx)
  const fieldLines: string[] = []
  // 先走一遍字段让嵌套类型先入 blocks，保证父类型引用时子类型已声明
  for (const [key, child] of shape.fields) {
    fieldLines.push(fieldLine(key, child, ctx))
  }
  const head =
    ctx.opts.type === 'type'
      ? `${prefixOf(ctx)}type ${name} = {`
      : `${prefixOf(ctx)}interface ${name} {`
  ctx.blocks.push([head, ...fieldLines, '}'].join('\n'))
  return name
}

function prefixOf(ctx: Ctx): string {
  if (ctx.opts.mode === 'export') return 'export '
  if (ctx.opts.mode === 'declare') return 'declare '
  return ''
}

function fieldLine(key: string, shape: Shape, ctx: Ctx): string {
  const childName = shape.kind === 'array' ? singular(key) : key
  const typeText = describe(shape, childName, ctx)
  const optional = shape.nullable && !ctx.opts.strict ? '?' : ''
  const readonly = ctx.opts.style === 'readonly' ? 'readonly ' : ''
  const label = IDENTIFIER.test(key) ? key : JSON.stringify(key)
  return `${ctx.pad}${readonly}${label}${optional}: ${typeText};`
}

/** 根节点必须是对象或对象数组：标量样本推不出有意义的类型声明 */
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
 * JSON 转 TypeScript —— 由样本推断 TS 类型声明。
 * 空输入返回空串；超长与非法输入抛 JsonToTsError（中文提示，UI 直接展示）。
 */
export function transform(input: JsonToTsInput, options: JsonToTsOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonToTsError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToTsError('不是合法的 JSON')
  }

  if (!isSupportedRoot(parsed)) {
    throw new JsonToTsError('根节点必须是对象或对象数组')
  }

  const ctx: Ctx = {
    opts: options,
    pad: indentUnit(options.indent),
    blocks: [],
    used: new Map<string, number>(),
  }
  describe(infer(parsed), ROOT_NAME, ctx)
  return ctx.blocks.length === 0 ? '' : `${ctx.blocks.join('\n\n')}\n`
}
