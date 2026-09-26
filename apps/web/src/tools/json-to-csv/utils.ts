import type { JsonToCsvInput, JsonToCsvOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToCsvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToCsvError'
  }
}

const MAX_INPUT = 2_000_000

const DELIMITERS = {
  comma: ',',
  semicolon: ';',
  tab: '\t',
  pipe: '|',
} as const

type Row = Map<string, string>

/** 把一个值摊平到一行：对象用点号、数组用 [n] 拼路径 */
function flattenInto(target: Row, path: string, value: unknown): void {
  if (value === null || value === undefined) {
    target.set(path, '')
    return
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      target.set(path, '')
      return
    }
    value.forEach((item, index) => flattenInto(target, `${path}[${index}]`, item))
    return
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      target.set(path, '')
      return
    }
    for (const [key, child] of entries) {
      flattenInto(target, path ? `${path}.${key}` : key, child)
    }
    return
  }
  // 标量
  target.set(path, String(value))
}

/** nested 风格：只取顶层键，非标量值整体压成 JSON 文本放进一格 */
function topLevelRow(value: Record<string, unknown>): Row {
  const row = new Map<string, string>()
  for (const [key, child] of Object.entries(value)) {
    if (child === null || child === undefined) {
      row.set(key, '')
    } else if (Array.isArray(child) || typeof child === 'object') {
      row.set(key, JSON.stringify(child))
    } else {
      row.set(key, String(child))
    }
  }
  return row
}

/** 按一格内容判断是否必须加引号（含分隔符 / 引号 / 换行） */
function needsQuote(text: string, delimiter: string): boolean {
  return (
    text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r')
  )
}

function escapeCell(text: string, delimiter: string, mode: JsonToCsvOptions['quote']): string {
  if (mode === 'none') return text
  const quoteIt = mode === 'all' || needsQuote(text, delimiter)
  return quoteIt ? `"${text.replace(/"/g, '""')}"` : text
}

/** 归一化输入为「对象数组」；标量数组 / 非对象根一律拒绝 */
function normalizeRows(parsed: unknown): Record<string, unknown>[] {
  const list = Array.isArray(parsed) ? parsed : [parsed]
  if (list.length === 0) return []
  for (const item of list) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new JsonToCsvError('只支持对象数组，或单个对象（元素不能是标量或数组）')
    }
  }
  return list as Record<string, unknown>[]
}

/**
 * JSON 转 CSV。
 * 空输入返回空串；空数组 `[]` 也返回空串（无数据行、也推不出列）。
 * 非法 JSON / 非标对象根抛 JsonToCsvError。
 */
export function transform(input: JsonToCsvInput, options: JsonToCsvOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new JsonToCsvError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToCsvError('不是合法的 JSON')
  }

  const objects = normalizeRows(parsed)
  if (objects.length === 0) return ''

  const rows: Row[] = objects.map((item) => {
    if (options.style === 'flatten') {
      const row = new Map<string, string>()
      flattenInto(row, '', item)
      return row
    }
    return topLevelRow(item)
  })

  // 列序：按首次出现顺序求并集
  const columns: string[] = []
  for (const row of rows)
    for (const key of row.keys()) if (!columns.includes(key)) columns.push(key)

  const delimiter = DELIMITERS[options.delimiter]
  const lineOf = (cells: readonly string[]): string =>
    cells.map((cell) => escapeCell(cell, delimiter, options.quote)).join(delimiter)

  const lines: string[] = []
  if (options.withHeader) lines.push(lineOf(columns))
  for (const row of rows) lines.push(lineOf(columns.map((col) => row.get(col) ?? '')))
  return lines.join('\n')
}
