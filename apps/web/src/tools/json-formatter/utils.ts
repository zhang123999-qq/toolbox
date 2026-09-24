import type { JsonInput, JsonOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonFormatError'
  }
}

/**
 * 格式化 JSON —— 纯函数，不依赖 React / DOM，可独立单测。
 * 必须处理三类输入：空值、超长、非法。
 */
export function transform(input: JsonInput, options: JsonOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > 5_000_000) {
    throw new JsonFormatError('输入超过 5MB 上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonFormatError('不是合法的 JSON')
  }

  const indent = Number(options.indent)
  return JSON.stringify(parsed, options.sortKeys ? sortedReplacer : undefined, indent)
}

/** 递归按键名排序后输出，用于 sortKeys 选项 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[k] = (value as Record<string, unknown>)[k]
  }
  return sorted
}

/** 压缩（去空白），供 UI 扩展使用 */
export function minify(input: JsonInput): string {
  if (!input.text.trim()) return ''
  try {
    return JSON.stringify(JSON.parse(input.text))
  } catch {
    throw new JsonFormatError('不是合法的 JSON')
  }
}
