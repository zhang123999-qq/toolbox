import type { SortInput, SortOptions } from './schema'

/** 取行内第一个数字（含负号与小数）；行里没有数字返回 null */
export function leadingNumber(line: string): number | null {
  const matched = /-?\d+(?:\.\d+)?/.exec(line)
  if (!matched) return null
  const value = Number(matched[0])
  return Number.isNaN(value) ? null : value
}

/**
 * 比较键：字典序取字符串、长度取字符数、数字取行内第一个数字。
 * 返回 null 表示「排到最后」（只有数字模式会用到）。
 */
export function compareKey(line: string, options: SortOptions): string | number | null {
  if (options.sortBy === 'length') return [...line].length
  if (options.sortBy === 'number') return leadingNumber(line)
  return options.ignoreCase ? line.toLowerCase() : line
}

/** 按行排序：相等时保持原相对顺序（稳定排序） */
export function transform(input: SortInput, options: SortOptions): string {
  const direction = options.descending ? -1 : 1
  return input.text
    .split(/\r?\n/)
    .map((line, index) => ({ line, index, key: compareKey(line, options) }))
    .sort((a, b) => {
      // 数字模式下没有数字的行统一排最后，且不受升降序影响
      if (a.key === null && b.key === null) return a.index - b.index
      if (a.key === null) return 1
      if (b.key === null) return -1
      if (typeof a.key === 'number' && typeof b.key === 'number') {
        return (a.key - b.key) * direction
      }
      // 用码点序而非 localeCompare：Node 与浏览器的 ICU 数据不同，结果会漂
      const left = String(a.key)
      const right = String(b.key)
      return (left < right ? -1 : left > right ? 1 : 0) * direction
    })
    .map((item) => item.line)
    .join('\n')
}
