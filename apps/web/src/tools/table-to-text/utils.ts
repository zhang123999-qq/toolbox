import { parseTable, toCsv, toJson, toMarkdownTable } from '../../lib/table'
import type { TableToTextInput, TableToTextOptions } from './schema'

/**
 * 分隔文本 → Markdown / CSV / JSON。
 * 解析与渲染都在 lib/table（工具之间禁止互相 import，共用逻辑一律上提）。
 */
export function transform(input: TableToTextInput, options: TableToTextOptions): string {
  const rows = parseTable(input.text, options.delimiter)
  if (rows.length === 0) return ''
  if (options.format === 'csv') return toCsv(rows)
  if (options.format === 'json') return toJson(rows, options.header)
  return toMarkdownTable(rows, options.header)
}
