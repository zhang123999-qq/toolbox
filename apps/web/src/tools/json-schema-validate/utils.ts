import type { SchemaValidateInput, SchemaValidateOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonSchemaValidateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonSchemaValidateError'
  }
}

/** 单侧长度上限 */
export const MAX_INPUT = 1_000_000

/** 错误条数上限：坏数据上一处类型错能衍生出成百上千条，得封顶 */
const MAX_ERRORS = 1_000

/** 本工具实现的关键字子集 */
const KEYWORDS: ReadonlySet<string> = new Set([
  'type',
  'required',
  'enum',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
  'items',
  'properties',
  'additionalProperties',
])

/** 不影响校验结果的描述性关键字，遇到直接放行 */
const ANNOTATIONS: ReadonlySet<string> = new Set([
  '$schema',
  '$id',
  '$comment',
  'title',
  'description',
  'default',
  'examples',
])

/** 通过时的输出语 */
const PASSED = '校验通过：符合 Schema 要求'

interface Found {
  readonly path: string
  readonly message: string
}

/** 数据的类型名，与 Schema 的 type 取值对齐 */
function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return typeof value
}

/** 是否普通对象（排除 null 与数组） */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 是否 Schema 对象（true / false 是合法的 Schema，单独处理） */
function isSchemaObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value)
}

/**
 * 类型断言：`type` 可以是单个字符串或字符串数组。
 * `number` 要接受整数（反过来 `integer` 不能放宽），这是 draft 的既定语义。
 */
function matchesType(value: unknown, expected: string): boolean {
  const actual = typeOf(value)
  if (expected === actual) return true
  return expected === 'number' && actual === 'integer'
}

/** 把期望类型渲染成中文报错片段 */
function joinTypes(expected: unknown): string {
  return Array.isArray(expected) ? expected.join(' / ') : String(expected)
}

/**
 * 按 Schema 递归校验单个节点，收集不符合项。
 *
 * 一旦类型就不对，后续关键字（length、minimum…）再报只会是噪音，直接收手；
 * 严格模式下遇到子集外的关键字报错，避免「明明有约束却没生效」的假通过。
 */
function validate(
  value: unknown,
  schema: unknown,
  path: string,
  found: Found[],
  strict: boolean,
): void {
  if (found.length >= MAX_ERRORS) return
  if (schema === true) return
  if (schema === false) {
    found.push({ path, message: 'Schema 为 false，任何取值都不通过' })
    return
  }
  if (!isSchemaObject(schema)) {
    throw new JsonSchemaValidateError(`${path} 处的 Schema 必须是对象或布尔值`)
  }

  for (const keyword of Object.keys(schema)) {
    if (KEYWORDS.has(keyword) || ANNOTATIONS.has(keyword)) continue
    if (strict) {
      throw new JsonSchemaValidateError(
        `${path} 处的 Schema 含不支持的关键字 ${keyword}（本工具只实现子集，见 README）`,
      )
    }
  }

  if (typeof schema.type === 'string') {
    if (!matchesType(value, schema.type)) {
      found.push({ path, message: `类型不匹配，期望 ${schema.type}，实际 ${typeOf(value)}` })
      return
    }
  } else if (Array.isArray(schema.type)) {
    const matched = schema.type.some((candidate) => matchesType(value as string, candidate))
    if (!matched) {
      found.push({
        path,
        message: `类型不匹配，期望 ${joinTypes(schema.type)}，实际 ${typeOf(value)}`,
      })
      return
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => deepEqual(item, value))) {
    found.push({ path, message: `取值不在 enum 允许的取值列表内` })
  }

  if (typeof value === 'number' && typeof schema.minimum === 'number' && value < schema.minimum) {
    found.push({ path, message: `小于 minimum ${schema.minimum}，实际 ${value}` })
  }
  if (typeof value === 'number' && typeof schema.maximum === 'number' && value > schema.maximum) {
    found.push({ path, message: `大于 maximum ${schema.maximum}，实际 ${value}` })
  }

  if (typeof value === 'string') {
    const length = [...value].length
    if (typeof schema.minLength === 'number' && length < schema.minLength) {
      found.push({ path, message: `长度 ${length} 短于 minLength ${schema.minLength}` })
    }
    if (typeof schema.maxLength === 'number' && length > schema.maxLength) {
      found.push({ path, message: `长度 ${length} 长于 maxLength ${schema.maxLength}` })
    }
    if (typeof schema.pattern === 'string') {
      let regex: RegExp
      try {
        regex = new RegExp(schema.pattern)
      } catch {
        throw new JsonSchemaValidateError(`${path} 处 Schema 的 pattern 不是合法正则`)
      }
      if (!regex.test(value)) {
        found.push({ path, message: `不匹配 pattern ${schema.pattern}` })
      }
    }
  }

  if (isPlainObject(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (typeof key === 'string' && !(key in value)) {
          found.push({ path, message: `缺少必填字段 ${key}` })
        }
      }
    }
    if (isSchemaObject(schema.properties)) {
      for (const key of Object.keys(schema.properties)) {
        if (key in value)
          validate(value[key], schema.properties[key], `${path}.${key}`, found, strict)
      }
    }
    const extra = isSchemaObject(schema.additionalProperties)
      ? schema.additionalProperties
      : schema.additionalProperties === false
        ? null
        : undefined
    if (extra === null || extra !== undefined) {
      const declared = isSchemaObject(schema.properties)
        ? new Set(Object.keys(schema.properties))
        : new Set<string>()
      for (const key of Object.keys(value)) {
        if (declared.has(key)) continue
        if (extra === null) {
          found.push({ path, message: `不允许出现额外字段 ${key}` })
        } else {
          validate(value[key], extra, `${path}.${key}`, found, strict)
        }
      }
    }
  }

  if (Array.isArray(value) && schema.items !== undefined && schema.items !== true) {
    value.forEach((item, index) => {
      validate(item, schema.items, `${path}[${index}]`, found, strict)
    })
  }
}

/** enum 的取值比较：标量看恒等，对象 / 数组看序列化后的字面量 */
function deepEqual(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}

/**
 * 按 Schema 校验 —— 纯函数，不依赖 React / DOM。
 *
 * 规划表原定用 ajv，但新增依赖被禁止，这里实现日常够用的关键字子集。
 * 子集外的关键字在严格模式下会报错，避免用户以为约束已生效。
 */
export function transform(input: SchemaValidateInput, options: SchemaValidateOptions): string {
  if (!input.text.trim() && !input.textB.trim()) return ''

  if (input.text.length > MAX_INPUT || input.textB.length > MAX_INPUT) {
    throw new JsonSchemaValidateError(`单侧输入超过 ${MAX_INPUT} 字符上限`)
  }
  if (!input.text.trim()) throw new JsonSchemaValidateError('待校验的 JSON 为空，请先在左栏填写')
  if (!input.textB.trim()) throw new JsonSchemaValidateError('JSON Schema 为空，请先在右栏填写')

  let value: unknown
  let schema: unknown
  try {
    value = JSON.parse(input.text)
  } catch {
    throw new JsonSchemaValidateError('待校验的内容不是合法的 JSON')
  }
  try {
    schema = JSON.parse(input.textB)
  } catch {
    throw new JsonSchemaValidateError('Schema 不是合法的 JSON')
  }

  const found: Found[] = []
  validate(value, schema, '$', found, options.strict)
  if (found.length === 0) return PASSED

  const shown = options.mode === 'first' ? found.slice(0, 1) : found.slice(0, MAX_ERRORS)
  const head =
    options.mode === 'first' ? '校验未通过（仅显示第 1 处）' : `校验未通过（共 ${found.length} 处）`
  return [head, ...shown.map((item) => `  ${item.path}：${item.message}`)].join('\n')
}
