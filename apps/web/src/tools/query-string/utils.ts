import type { QueryInput, QueryOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class QueryStringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryStringError'
  }
}

const MAX_INPUT = 100_000

export type QueryValue = string | string[]
export type QueryObject = Record<string, QueryValue>

/**
 * 查询串与对象互转 —— 纯函数，不依赖 React / DOM。
 * mode=parse：查询串（或完整 URL）→ JSON 对象
 * mode=build：JSON 对象 → 查询串
 */
export function transform(input: QueryInput, options: QueryOptions): string {
  const raw = input.text.trim()
  if (!raw) return ''

  if (raw.length > MAX_INPUT) {
    throw new QueryStringError('输入超过 100000 字符上限')
  }

  return options.mode === 'build'
    ? build(raw, options.sortKeys)
    : JSON.stringify(parse(raw, options.sortKeys), null, 2)
}

/** 查询串 → 对象；重复键合并为数组 */
export function parse(text: string, sortKeys: boolean): QueryObject {
  const params = new URLSearchParams(toSearch(text))
  const keys = [...new Set(params.keys())]
  const ordered = sortKeys ? [...keys].sort() : keys

  const result: QueryObject = {}
  for (const key of ordered) {
    const values = params.getAll(key)
    result[key] = values.length > 1 ? values : values[0]
  }
  return result
}

/** 对象（JSON 文本）→ 查询串 */
export function build(text: string, sortKeys: boolean): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new QueryStringError('不是合法的 JSON 对象')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new QueryStringError('生成模式要求输入为 JSON 对象')
  }

  const source = parsed as Record<string, unknown>
  const keys = Object.keys(source)
  const params = new URLSearchParams()
  for (const key of sortKeys ? [...keys].sort() : keys) {
    const value = source[key]
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item))
    } else if (value === null || value === undefined) {
      params.append(key, '')
    } else {
      params.append(key, String(value))
    }
  }
  return params.toString()
}

/** 允许直接粘贴完整 URL：自动截取查询部分 */
function toSearch(text: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    try {
      return new URL(text).search.replace(/^\?/, '')
    } catch {
      throw new QueryStringError('不是合法的 URL')
    }
  }
  return text.replace(/^\?/, '')
}
