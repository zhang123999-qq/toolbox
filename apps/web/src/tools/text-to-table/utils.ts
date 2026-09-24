import { parseTable, renderAlignedTable } from '../../lib/table'
import type { TextToTableInput, TextToTableOptions } from './schema'

/**
 * 分隔文本 → 等宽对齐的表格（终端 / 日志 / README 可直接贴）。
 * 对齐按显示宽度算：中日韩字符算两个字符宽，故中英混排也能对齐。
 */
export function transform(input: TextToTableInput, options: TextToTableOptions): string {
  const rows = parseTable(input.text, options.delimiter)
  return renderAlignedTable(rows, options.style, options.header)
}
