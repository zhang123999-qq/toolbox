import { parseTable } from '../../lib/table'
import type { ExtractColumnInput, ExtractColumnOptions } from './schema'

/**
 * 解析列号表达式：支持单个（2）、多个（1,3）、范围（1-3）与开放范围（2-）。
 * 列号从 1 开始，去重后升序返回。
 */
export function parseColumnExpr(expr: string, total: number): number[] {
  const picked = new Set<number>()
  for (const part of expr.split(',')) {
    const token = part.trim()
    if (token === '') continue
    const range = /^(\d+)?-(\d+)?$/.exec(token)
    if (range) {
      const start = range[1] ? Number(range[1]) : 1
      const end = range[2] ? Number(range[2]) : Math.max(total, start)
      for (let i = start; i <= end; i += 1) picked.add(i)
      continue
    }
    const single = Number(token)
    if (Number.isInteger(single) && single > 0) picked.add(single)
  }
  return [...picked].sort((a, b) => a - b)
}

/** 提取指定列；列不存在时按 skipMissing 决定是跳过还是填空串 */
export function transform(input: ExtractColumnInput, options: ExtractColumnOptions): string {
  const rows = parseTable(input.text, options.delimiter)
  if (rows.length === 0) return ''
  const total = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const cols = parseColumnExpr(options.columns, total)
  return rows
    .map((row) =>
      cols
        .map((col) => {
          if (col <= row.length) return row[col - 1]
          return options.skipMissing ? null : ''
        })
        .filter((cell): cell is string => cell !== null)
        .join(options.joiner),
    )
    .join('\n')
}
