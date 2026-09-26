import type { JsonSortInput, JsonSortOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonSortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonSortError'
  }
}

/** 单次处理上限：超过则拒绝，避免超大文本卡死主线程 */
export const MAX_INPUT = 1_000_000

/** 缩进档位：与常见编辑器默认一致 */
const PRETTY = 2

/**
 * 用 `localeCompare` 之外的字典序比较。
 *
 * 排序的目的是让两份 JSON 能直接 diff，`locale` 排序会把大小写与中文按本地规则重排，
 * 同一份数据在不同机器上可能排得不一样；`codePoint` 比较才是稳定可复现的。
 */
function compareKeys(a: string, b: string, descending: boolean): number {
  const order = a < b ? -1 : a > b ? 1 : 0
  return descending ? -order : order
}

/** 递归重排：对象的键按序重建，数组元素保持原顺序但内部继续递归 */
function sortValue(value: unknown, descending: boolean): unknown {
  if (Array.isArray(value)) return value.map((item) => sortValue(item, descending))
  if (typeof value !== 'object' || value === null) return value
  const source = value as Record<string, unknown>
  const keys = Object.keys(source).sort((a, b) => compareKeys(a, b, descending))
  const sorted: Record<string, unknown> = {}
  for (const key of keys) sorted[key] = sortValue(source[key], descending)
  return sorted
}

/**
 * 按键名递归排序 —— 纯函数，不依赖 React / DOM。
 *
 * 只动对象的键顺序，不动数组元素顺序：数组是有序容器，重排会破坏语义。
 */
export function transform(input: JsonSortInput, options: JsonSortOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new JsonSortError(`输入超过 ${MAX_INPUT} 字符上限`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonSortError('不是合法的 JSON')
  }

  const sorted = sortValue(parsed, options.descending)
  return options.format === 'pretty' ? JSON.stringify(sorted, null, PRETTY) : JSON.stringify(sorted)
}
