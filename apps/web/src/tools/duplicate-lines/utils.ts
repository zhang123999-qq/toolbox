import type { DuplicateLinesInput, DuplicateLinesOptions } from './schema'
// 去重保序的原语已在 lib/pipeline.ts 定义，#70 文本工作台复用同一份
import { dedupeLines } from '../../lib/pipeline'

/** 归一化：按选项决定是否去首尾空白、是否忽略大小写 */
export function normalize(line: string, options: DuplicateLinesOptions): string {
  let out = options.trim ? line.trim() : line
  if (options.ignoreCase) out = out.toLowerCase()
  return out
}

/** 统计每行出现次数：键是归一化后的行，值是次数与首次出现的原文 */
export function tally(
  lines: readonly string[],
  options: DuplicateLinesOptions,
): Map<string, { count: number; sample: string }> {
  const map = new Map<string, { count: number; sample: string }>()
  for (const line of lines) {
    const key = normalize(line, options)
    const hit = map.get(key)
    if (hit) hit.count += 1
    else map.set(key, { count: 1, sample: line })
  }
  return map
}

/** 只保留首次出现的行（去重保序） */
export function uniqueLines(lines: readonly string[], options: DuplicateLinesOptions): string[] {
  return dedupeLines(lines, (line) => normalize(line, options))
}

/** 报告：按出现次数降序列出重复行 */
export function report(lines: readonly string[], options: DuplicateLinesOptions): string {
  const map = tally(lines, options)
  const dupes = [...map.entries()].filter(([, v]) => v.count > 1)
  if (dupes.length === 0) return '没有重复行。'
  dupes.sort((a, b) => b[1].count - a[1].count)
  const rows = dupes.map(([, v]) => v.count + ' 次\t' + v.sample)
  const total = dupes.reduce((sum, [, v]) => sum + v.count, 0)
  return ['重复行 ' + dupes.length + ' 种，共 ' + total + ' 行（含首次出现）', ...rows].join('\n')
}

/** 检测 / 去重 / 只留重复行 */
export function transform(input: DuplicateLinesInput, options: DuplicateLinesOptions): string {
  if (input.text === '') return ''
  const lines = input.text.split(/\r?\n/)
  if (options.mode === 'unique') return uniqueLines(lines, options).join('\n')
  const map = tally(lines, options)
  if (options.mode === 'dupes') {
    return lines.filter((line) => (map.get(normalize(line, options))?.count ?? 0) > 1).join('\n')
  }
  return report(lines, options)
}
