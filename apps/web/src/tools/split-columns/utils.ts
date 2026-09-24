import { parseTable } from '../../lib/table'
import type { SplitColumnsInput, SplitColumnsOptions } from './schema'

/**
 * 按分隔符分列，三种看法：
 *  - list：每行用「 | 」把各列接起来，快速看清分列结果
 *  - numbered：每列单独一行并带列号，便于核对列数与错位
 *  - count：只统计每行列数的分布，用来发现脏数据
 */
export function transform(input: SplitColumnsInput, options: SplitColumnsOptions): string {
  const rows = parseTable(input.text, options.delimiter)
  if (rows.length === 0) return ''

  if (options.mode === 'count') {
    const counts = new Map<number, number>()
    for (const row of rows) counts.set(row.length, (counts.get(row.length) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([cols, lines]) => cols + ' 列：' + lines + ' 行')
      .join('\n')
  }

  if (options.mode === 'numbered') {
    return rows
      .map(
        (row, index) =>
          '第 ' +
          (index + 1) +
          ' 行（' +
          row.length +
          ' 列）\n' +
          row.map((cell, col) => '  [' + (col + 1) + '] ' + cell).join('\n'),
      )
      .join('\n')
  }

  return rows.map((row) => row.join(' | ')).join('\n')
}
