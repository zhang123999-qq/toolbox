/**
 * 分隔文本 ↔ 表格的共用解析与渲染。
 *
 * 文本域 #22「表格转文本」与 #23「文本转表格」都要把分隔文本解析成二维表、
 * 再按不同版式输出。按 DEVELOPMENT.md §8.4「工具之间禁止互相 import，
 * 共用逻辑一律上提到 lib」，这里只放与 UI 无关的纯函数。
 */
import { isCjk } from './text'

/** 可选分隔符；`auto` 表示按内容猜 */
export type DelimiterName = 'auto' | 'comma' | 'tab' | 'semicolon' | 'pipe' | 'space'

/** 去掉 `auto` 后的具体分隔符 */
export type ResolvedDelimiter = Exclude<DelimiterName, 'auto'>

/** 表格输出版式：`plain` 空格对齐、`grid` ASCII 边框 */
export type TableStyle = 'plain' | 'grid'

const DELIMITER_CHAR: Record<ResolvedDelimiter, string> = {
  comma: ',',
  tab: '\t',
  semicolon: ';',
  pipe: '|',
  space: ' ',
}

/** 具体分隔符对应的字符。`space` 约定按「两个及以上空白」切分，避免把句子拆开 */
export function delimiterChar(name: ResolvedDelimiter): string {
  return DELIMITER_CHAR[name]
}

/**
 * 猜测分隔符：逐行统计各候选分隔符的出现次数，取「每行都出现且次数最多」的那个。
 * 都猜不出来时退回逗号。
 */
export function detectDelimiter(text: string): ResolvedDelimiter {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line !== '')
    .slice(0, 20)
  let best: ResolvedDelimiter = 'comma'
  let bestScore = 0
  const order: ResolvedDelimiter[] = ['comma', 'tab', 'semicolon', 'pipe', 'space']
  for (const name of order) {
    const counts = lines.map((line) => splitRow(line, name).length - 1)
    if (counts.length === 0) continue
    const min = Math.min(...counts)
    if (min < 1) continue
    // 每行次数一致说明是真表格；不一致也允许，只是得分低
    const consistent = counts.every((count) => count === counts[0]) ? 1 : 0
    const score = min * 2 + consistent
    if (score > bestScore) {
      bestScore = score
      best = name
    }
  }
  return best
}

/**
 * 按分隔符切一行，支持双引号包裹（引号内的分隔符不切，`""` 表示字面量引号）。
 * `space` 走独立分支：按两个及以上空白切分，并忽略行首尾空白。
 */
export function splitRow(line: string, name: ResolvedDelimiter): string[] {
  if (name === 'space') return line.trim().split(/\s{2,}/)
  const ch = DELIMITER_CHAR[name]
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ch) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

/** 解析成二维表；空行丢弃，`auto` 时先猜分隔符 */
export function parseTable(text: string, name: DelimiterName): string[][] {
  if (text === '') return []
  const resolved: ResolvedDelimiter = name === 'auto' ? detectDelimiter(text) : name
  return text
    .split(/\r?\n/)
    .filter((line) => line !== '')
    .map((line) => splitRow(line, resolved))
}

/** 单元格的显示宽度：中日韩字符按 2 计，其余按 1 计 */
export function displayWidth(text: string): number {
  return [...text].reduce((sum, ch) => sum + (isCjk(ch) ? 2 : 1), 0)
}

/** 右补空格到指定显示宽度 */
function padCell(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)))
}

/** 列数：取各行最大值（行长度不齐时按空串补齐） */
function columnCount(rows: readonly string[][]): number {
  return rows.reduce((max, row) => Math.max(max, row.length), 0)
}

/** 按列算最大显示宽度 */
function columnWidths(rows: readonly string[][], cols: number): number[] {
  return Array.from({ length: cols }, (_, col) =>
    rows.reduce((max, row) => Math.max(max, displayWidth(row[col] ?? '')), 0),
  )
}

/** 取一行定长的单元格数组 */
function rowCells(row: readonly string[], cols: number): string[] {
  return Array.from({ length: cols }, (_, col) => row[col] ?? '')
}

/** 渲染对齐的纯文本表格（终端风格）。`header` 为真时在表头下加一条分隔线 */
export function renderAlignedTable(
  rows: readonly string[][],
  style: TableStyle,
  header: boolean,
): string {
  if (rows.length === 0) return ''
  const cols = columnCount(rows)
  const widths = columnWidths(rows, cols)

  if (style === 'plain') {
    return rows
      .map((row) =>
        rowCells(row, cols)
          .map((cell, col) => padCell(cell, widths[col]))
          .join('  ')
          .replace(/\s+$/, ''),
      )
      .join('\n')
  }

  const border = '+' + widths.map((width) => '-'.repeat(width + 2)).join('+') + '+'
  const body = (cells: readonly string[]) =>
    '| ' + cells.map((cell, col) => padCell(cell, widths[col])).join(' | ') + ' |'
  const out: string[] = [border]
  rows.forEach((row, index) => {
    out.push(body(rowCells(row, cols)))
    if (header && index === 0) out.push(border)
  })
  out.push(border)
  return out.join('\n')
}

/**
 * 渲染 Markdown 表格。Markdown 必须有表头：未指定表头时用「列 1…」占位。
 */
export function toMarkdownTable(rows: readonly string[][], header: boolean): string {
  if (rows.length === 0) return ''
  const cols = columnCount(rows)
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
  const line = (cells: readonly string[]) =>
    '| ' + cells.map((cell) => escape(cell)).join(' | ') + ' |'
  const divider = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |'
  const out: string[] = []
  if (header && rows.length > 0) {
    out.push(line(rowCells(rows[0], cols)))
    out.push(divider)
    rows.slice(1).forEach((row) => out.push(line(rowCells(row, cols))))
  } else {
    out.push(line(Array.from({ length: cols }, (_, col) => '列 ' + (col + 1))))
    out.push(divider)
    rows.forEach((row) => out.push(line(rowCells(row, cols))))
  }
  return out.join('\n')
}

/** CSV 单元格：含逗号、引号或换行时加引号，内部引号翻倍 */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
}

/** 渲染 CSV；换行统一用 LF，与仓库其余产物一致 */
export function toCsv(rows: readonly string[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

/**
 * 渲染 JSON。`header` 为真时输出对象数组（表头做键，重名键加 `_2` 后缀），
 * 否则输出二维数组。
 */
export function toJson(rows: readonly string[][], header: boolean): string {
  if (rows.length === 0) return '[]'
  if (!header) return JSON.stringify(rows, null, 2)
  const cols = columnCount(rows)
  const seen = new Map<string, number>()
  const keys = rowCells(rows[0], cols).map((raw, col) => {
    const base = raw === '' ? 'column' + (col + 1) : raw
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : base + '_' + n
  })
  const data = rows.slice(1).map((row) => {
    const record: Record<string, string> = {}
    const cells = rowCells(row, cols)
    keys.forEach((key, col) => {
      record[key] = cells[col]
    })
    return record
  })
  return JSON.stringify(data, null, 2)
}
