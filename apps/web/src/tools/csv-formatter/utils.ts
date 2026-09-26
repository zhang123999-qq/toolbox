import Papa from 'papaparse'
import type { CsvFormatterInput, CsvFormatterOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class CsvFormatterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvFormatterError'
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

/** 列宽按「显示宽度」算：中日韩全角字符占两格，否则对齐后仍会错行 */
const WIDE_CHAR =
  /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/

/** 字符串的显示宽度（全角算 2 列） */
export function displayWidth(value: string): number {
  let width = 0
  for (const char of value) width += WIDE_CHAR.test(char) ? 2 : 1
  return width
}

/** 右侧补空格到指定显示宽度 */
function padTo(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - displayWidth(value)))
}

/** 去掉 CRLF，统一成 LF；顺便去掉末尾多余空行 */
function normalizeBreaks(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\n+$/, '')
}

/**
 * 解析成二维表。交给 papaparse 处理引号与转义，不自己按分隔符切字符串——
 * `a,"b,c",d` 这类行只有真正的 CSV 解析器才能切对。
 */
export function parseRows(text: string, delimiter: string): string[][] {
  const result = Papa.parse<string[]>(normalizeBreaks(text), {
    delimiter,
    newline: '\n',
    skipEmptyLines: 'greedy',
  })
  const quoted = result.errors.find((error) => error.type === 'Quotes')
  if (quoted) {
    throw new CsvFormatterError(
      `第 ${(quoted.row ?? 0) + 1} 行的引号没有配对，无法解析（${quoted.message}）`,
    )
  }
  return result.data
}

export interface Mismatch {
  /** 行号，从 1 起算（与编辑器一致） */
  readonly line: number
  readonly count: number
  readonly raw: string
}

/** 以首行列数为准，找出所有列数不一致的行 */
export function findMismatches(rows: readonly string[][]): readonly Mismatch[] {
  if (rows.length === 0) return []
  const expected = rows[0].length
  const out: Mismatch[] = []
  rows.forEach((row, index) => {
    if (index === 0) return
    if (row.length !== expected) {
      out.push({ line: index + 1, count: row.length, raw: row.join(',') })
    }
  })
  return out
}

/** 校验报告：列数一致时给出总览，否则列出每一处出错行 */
export function buildReport(rows: readonly string[][], mismatch: readonly Mismatch[]): string {
  const header = `共 ${rows.length} 行，首行 ${rows[0].length} 列`
  if (mismatch.length === 0) return `${header}，列数全部一致 ✓`
  const detail = mismatch.map((item) => {
    const raw = item.raw.length > 60 ? `${item.raw.slice(0, 60)}…` : item.raw
    return `第 ${item.line} 行：${item.count} 列（应为 ${rows[0].length} 列）→ ${raw}`
  })
  return [`${header}，${mismatch.length} 行列数不一致：`, '', ...detail].join('\n')
}

/** 对齐列宽：每列补齐到该列最宽的显示宽度，便于肉眼看表格 */
export function alignRows(rows: readonly string[][], delimiter: string): string {
  const widths: number[] = []
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, displayWidth(cell))
    })
  }
  return rows
    .map((row) => row.map((cell, index) => padTo(cell, widths[index] ?? 0)).join(delimiter))
    .join('\n')
}

/** 规范化：交给 papaparse 重新序列化，去掉多余引号与空白，换行统一 LF */
export function minifyRows(rows: readonly string[][], delimiter: string): string {
  return Papa.unparse(rows as string[][], { delimiter, newline: '\n' })
}

/**
 * CSV 格式化 / 校验 —— 纯函数，不依赖 React / DOM，可独立单测。
 * strict 打开时列数不一致直接抛错，否则只在 validate 报告里提示。
 */
export function transform(input: CsvFormatterInput, options: CsvFormatterOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new CsvFormatterError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }

  const delimiter = DELIMITER_CHAR[options.delimiter] ?? ','
  const rows = parseRows(input.text, delimiter)
  if (rows.length === 0) return ''

  const mismatch = findMismatches(rows)
  if (options.strict && mismatch.length > 0) {
    throw new CsvFormatterError(buildReport(rows, mismatch))
  }

  if (options.mode === 'validate') return buildReport(rows, mismatch)
  if (options.mode === 'align') return alignRows(rows, delimiter)
  return minifyRows(rows, delimiter)
}
