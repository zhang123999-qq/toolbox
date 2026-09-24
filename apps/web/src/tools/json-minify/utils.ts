import type { MinifyInput, MinifyOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonMinifyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonMinifyError'
  }
}

const MAX_INPUT = 5_000_000

/**
 * 压缩 JSON —— 纯函数，不依赖 React / DOM，可独立单测。
 * 与 json-formatter 的区别：本工具只做「去空白」，不提供缩进档位。
 */
export function transform(input: MinifyInput, options: MinifyOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonMinifyError('输入超过 5MB 上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonMinifyError('不是合法的 JSON')
  }

  return JSON.stringify(parsed, options.sortKeys ? sortedReplacer : undefined)
}

/** 递归按键名排序，供 sortKeys 选项使用 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }
  const source = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    sorted[key] = source[key]
  }
  return sorted
}
