import Papa from 'papaparse'
import type { CsvToTsvInput, CsvToTsvOptions } from './schema'

/** CSV 与 TSV 的往返转换：交给 papaparse 处理引号与转义，不自己拼字符串 */
export function convert(text: string, mode: string): string {
  const from = mode === 'tsv2csv' ? '\t' : ','
  const to = mode === 'tsv2csv' ? ',' : '\t'
  const parsed = Papa.parse<string[]>(text, { delimiter: from })
  // newline 固定为 \n：papaparse 默认输出 CRLF，与仓库统一的 LF 不一致
  return Papa.unparse(parsed.data, { delimiter: to, newline: '\n' })
}

export function transform(input: CsvToTsvInput, options: CsvToTsvOptions): string {
  if (input.text.trim() === '') return ''
  return convert(input.text, options.mode)
}
