import type { JsonToTomlInput, JsonToTomlOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToTomlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToTomlError'
  }
}

const MAX_INPUT = 2_000_000

/** 裸键（A-Z a-z 0-9 _ -）可直接书写 */
const BARE_KEY = /^[A-Za-z0-9_-]+$/

function keyPart(text: string): string {
  return BARE_KEY.test(text) ? text : JSON.stringify(text)
}

function joinPath(segments: readonly string[]): string {
  return segments.map(keyPart).join('.')
}

/** 是否含 C0 控制字符（U+0000–U+001F）；TOML literal 单引号串不允许出现 */
function hasControlChar(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) <= 0x1f) return true
  }
  return false
}

/** 字符串：literal 优先单引号，含单引号 / 控制字符时回退双引号 */
function stringText(text: string, style: JsonToTomlOptions['style']): string {
  if (style === 'literal' && !text.includes("'") && !hasControlChar(text)) {
    return `'${text}'`
  }
  return JSON.stringify(text)
}

/** 标量值文本 */
function scalarText(value: unknown, style: JsonToTomlOptions['style']): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  return stringText(String(value), style)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 内联数组（不含对象）；对象数组走 [[array-of-tables]]，由调用方分流 */
function inlineArray(arr: readonly unknown[], style: JsonToTomlOptions['style']): string {
  const items = arr
    .filter((item) => item !== null && item !== undefined)
    .map((item) => (Array.isArray(item) ? inlineArray(item, style) : scalarText(item, style)))
  return `[${items.join(', ')}]`
}

/** 是否为「对象数组」（每个元素都是对象）；空数组按内联处理 */
function isObjectArray(value: unknown): value is readonly Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isObject(item))
}

/**
 * 输出一个表（表头 [path] / [[path]] 由父级负责）：先输出键值对，再输出子表。
 * TOML 要求一旦出现子表头，后续裸键就归子表所有，因此键值对必须排在子表之前。
 */
function emitObject(
  path: readonly string[],
  obj: Record<string, unknown>,
  style: JsonToTomlOptions['style'],
  lines: string[],
): void {
  const pairs: string[] = []
  const containers: Array<[string, unknown]> = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue // TOML 没有 null，跳过
    if (isObjectArray(value)) {
      containers.push([key, value])
    } else if (isObject(value)) {
      containers.push([key, value])
    } else if (Array.isArray(value)) {
      // 对象与标量混排无法用单一 TOML 形态表达
      if (value.some((item) => isObject(item))) {
        throw new JsonToTomlError(`数组 “${key}” 中对象与非对象混排，无法转成 TOML`)
      }
      pairs.push(`${keyPart(key)} = ${inlineArray(value, style)}`)
    } else {
      pairs.push(`${keyPart(key)} = ${scalarText(value, style)}`)
    }
  }

  lines.push(...pairs)

  for (const [key, value] of containers) {
    const childPath = [...path, key]
    if (isObjectArray(value)) {
      for (const element of value) {
        // 重复的数组表之间空一行，便于阅读（首段前面无内容时不空行）
        if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('')
        lines.push(`[[${joinPath(childPath)}]]`)
        emitObject(childPath, element, style, lines)
      }
    } else {
      lines.push(`[${joinPath(childPath)}]`)
      emitObject(childPath, value as Record<string, unknown>, style, lines)
    }
  }
}

/**
 * JSON 转 TOML。
 * 空输入返回空串；根节点必须是对象；非法 JSON 抛 JsonToTomlError。
 */
export function transform(input: JsonToTomlInput, options: JsonToTomlOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new JsonToTomlError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToTomlError('不是合法的 JSON')
  }
  if (!isObject(parsed)) {
    throw new JsonToTomlError('TOML 顶层必须是对象（标量或数组无法作为配置根）')
  }

  const lines: string[] = []
  emitObject([], parsed, options.style, lines)
  return lines.join('\n')
}
