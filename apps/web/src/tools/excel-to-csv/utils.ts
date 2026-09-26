import Papa from 'papaparse'
import {
  MAX_SPREADSHEET_FILE_BYTES,
  MAX_SPREADSHEET_INPUT,
  SpreadsheetError,
  detectDelimiter as libDetectDelimiter,
  parseTableText,
  resolveDelimiter as libResolveDelimiter,
} from '../../lib/spreadsheet'
import type { DelimiterName } from '../../lib/spreadsheet'
import type { ExcelToCsvInput, ExcelToCsvOptions } from './schema'

/**
 * 表格 / xlsx 的解析已上提到 lib/spreadsheet（与 Excel 转 JSON 共用）。
 * 这里再导出旧名字以兼容本工具的测试与 Tool；错误类直接复用同一个类，
 * 保证 `instanceof ExcelToCsvError` 仍成立。
 */
export const ExcelToCsvError = SpreadsheetError
export type ExcelToCsvError = SpreadsheetError

export const MAX_FILE_BYTES = MAX_SPREADSHEET_FILE_BYTES

const MAX_INPUT = MAX_SPREADSHEET_INPUT

export function resolveDelimiter(name: DelimiterName, text: string): string {
  return libResolveDelimiter(name, text)
}

export function detectDelimiter(text: string): DelimiterName {
  return libDetectDelimiter(text)
}

export {
  columnIndex,
  decodeXml,
  inflateRaw,
  parseTableText,
  pickSheet,
  rowsFromFileBytes,
  sharedStringsFrom,
  sheetToRows,
  sliceElements,
  xlsxToRows,
} from '../../lib/spreadsheet'

/** 二维表 → 分隔文本；补空串让每行等宽，避免 CSV 列数参差 */
export function rowsToDelimited(rows: readonly string[][], delimiter: string): string {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const even = rows.map((row) => {
    const out = [...row]
    while (out.length < width) out.push('')
    return out
  })
  return Papa.unparse(even, { delimiter, newline: '\n' })
}

/** 文本模式：表格文本 → CSV / TSV */
export function transform(input: ExcelToCsvInput, options: ExcelToCsvOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new ExcelToCsvError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }

  const rows = parseTableText(input.text, resolveDelimiter(options.delimiter, input.text))
  if (rows.length === 0) return ''
  return rowsToDelimited(rows, options.format === 'tsv' ? '\t' : ',')
}
