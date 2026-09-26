import Papa from 'papaparse'
import type { CsvToJsonInput, CsvToJsonOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class CsvToJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvToJsonError'
  }
}

/** 与 schema 的 max 保持一致 */
const MAX_INPUT = 5_000_000

const DELIMITER_CHAR: Record<string, string> = {
  comma: ',',
  tab: '\t',
  semicolon: ';',
  pipe: '|',
}

const NUMBER_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/

/**
 * 单元格 → JSON 值：空串与 `null` 转 null，`true`/`false` 转布尔，数字串转数字。
 * 两位以上的前导零（`007`）和超出安全整数范围的整数保持字符串——转成数字会丢信息。
 */
export function inferValue(cell: string): unknown {
  const value = cell.trim()
  if (value === '' || value === 'null') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (!NUMBER_RE.test(value)) return value
  if (/^-?\d+$/.test(value)) {
    if (/^-?0\d/.test(value)) return value
    const int = Number(value)
    return Number.isSafeInteger(int) ? int : value
  }
  const num = Number(value)
  return Number.isFinite(num) ? num : value
}

/** 表头去重：重名追加序号，空表头补 `column_N`，保证每行键唯一 */
export function buildHeader(row: readonly string[]): readonly string[] {
  const used = new Map<string, number>()
  return row.map((cell, index) => {
    const base = cell.trim() === '' ? `column_${index + 1}` : cell.trim()
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}_${seen + 1}`
  })
}

/**
 * CSV 转 JSON —— 纯函数，不依赖 React / DOM，可独立单测。
 * 首行为表头时输出对象数组，否则输出二维数组。
 */
export function transform(input: CsvToJsonInput, options: CsvToJsonOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new CsvToJsonError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }

  const delimiter = DELIMITER_CHAR[options.delimiter] ?? ','
  const parsed = Papa.parse<string[]>(input.text.replace(/\r\n?/g, '\n'), {
    delimiter,
    newline: '\n',
    skipEmptyLines: 'greedy',
  })
  const quoted = parsed.errors.find((error) => error.type === 'Quotes')
  if (quoted) {
    throw new CsvToJsonError(
      `第 ${(quoted.row ?? 0) + 1} 行的引号没有配对，无法解析（${quoted.message}）`,
    )
  }

  const rows = parsed.data
  if (rows.length === 0) return ''

  let value: unknown
  if (options.header) {
    const header = buildHeader(rows[0])
    value = rows.slice(1).map((row) => {
      const record: Record<string, unknown> = {}
      header.forEach((key, index) => {
        record[key] = inferValue(row[index] ?? '')
      })
      return record
    })
  } else {
    value = rows.map((row) => row.map(inferValue))
  }

  const indent = Number.parseInt(options.indent, 10)
  return JSON.stringify(value, null, indent)
}
