import {
  MAX_SPREADSHEET_FILE_BYTES,
  MAX_SPREADSHEET_INPUT,
  parseTableText,
  resolveDelimiter,
  rowsFromFileBytes,
} from '../../lib/spreadsheet'
import type { ExcelToJsonInput, ExcelToJsonOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class ExcelToJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExcelToJsonError'
  }
}

const MAX_INPUT = MAX_SPREADSHEET_INPUT
export const MAX_FILE_BYTES = MAX_SPREADSHEET_FILE_BYTES

/** 单元格类型推断：空 → null，数字字面量 → number，TRUE/FALSE → boolean，其余保持字符串 */
export function coerceCell(raw: string): unknown {
  if (raw === '') return null
  if (raw === 'TRUE' || raw === 'true') return true
  if (raw === 'FALSE' || raw === 'false') return false
  // 前导零（007、00.5、-01）通常是编号 / 邮编，保留为字符串
  if (/^-?0\d/.test(raw)) return raw
  if (/^-?(?:0|[1-9]\d*)$/.test(raw)) {
    const value = Number(raw)
    if (Number.isSafeInteger(value)) return value
  }
  if (/^-?(?:0|[1-9]\d*)\.\d+(?:[eE][+-]?\d+)?$|^-?(?:0|[1-9]\d*)[eE][+-]?\d+$/.test(raw)) {
    const value = Number(raw)
    if (Number.isFinite(value)) return value
  }
  return raw
}

/** 由表头生成合法 / 不重复的对象键 */
function headerKeys(header: readonly string[]): string[] {
  const used = new Map<string, number>()
  return header.map((cell, index) => {
    let key = cell.trim()
    if (key === '') key = `_${index + 1}`
    const seen = used.get(key) ?? 0
    used.set(key, seen + 1)
    return seen === 0 ? key : `${key}_${seen + 1}`
  })
}

/** 二维表 → JSON 字符串：有表头返回对象数组，否则返回二维数组 */
export function rowsToJson(rows: readonly (readonly string[])[], withHeader: boolean): string {
  if (rows.length === 0) return withHeader ? '[]' : '[]'

  if (!withHeader) {
    return JSON.stringify(
      rows.map((row) => row.map(coerceCell)),
      null,
      2,
    )
  }

  const keys = headerKeys(rows[0])
  const records = rows.slice(1).map((row) => {
    const record: Record<string, unknown> = {}
    keys.forEach((key, index) => {
      record[key] = coerceCell(row[index] ?? '')
    })
    return record
  })
  return JSON.stringify(records, null, 2)
}

/** 文本模式（粘贴 CSV/TSV）→ JSON；分隔符按首个非空行自动猜测 */
export function transform(input: ExcelToJsonInput, options: ExcelToJsonOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new ExcelToJsonError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  const delimiter = resolveDelimiter('auto', input.text)
  const rows = parseTableText(input.text, delimiter)
  if (rows.length === 0) return '[]'
  return rowsToJson(rows, options.withHeader)
}

/** 文件入口：.xlsx 走最小二进制解析，其余按 CSV/TSV 文本 */
export async function fileToJson(
  bytes: Uint8Array,
  fileName: string,
  options: ExcelToJsonOptions,
): Promise<string> {
  try {
    const rows = await rowsFromFileBytes(bytes, fileName, { delimiter: 'auto' })
    return rowsToJson(rows, options.withHeader)
  } catch (error) {
    if (error instanceof ExcelToJsonError) throw error
    throw new ExcelToJsonError(error instanceof Error ? error.message : '文件解析失败')
  }
}
