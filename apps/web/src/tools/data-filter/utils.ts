/**
 * data-filter（#689）工具函数：CSV 解析 / 条件解析 / 多条件过滤。
 * 全部纯函数，便于单测。
 */

export const EXAMPLE_CSV = [
  '姓名,年龄,城市,销售额',
  '张三,28,北京,12000',
  '李四,35,上海,9800',
  '王五,28,广州,15300',
  '赵六,41,深圳,7600',
  '钱七,35,杭州,11200',
].join('\n')

export const EXAMPLE_CONDITIONS = ['年龄 > 30', '城市 包含 海'].join('\n')

export type Row = string[]

/** 解析 CSV（支持双引号字段与 "" 转义），返回 [表头, 数据行] */
export function parseCsv(text: string): { headers: string[]; rows: Row[] } {
  const raw = text.replace(/\r\n?/g, '\n')
  const table: Row[] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let hasData = false
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
      hasData = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
      hasData = true
    } else if (ch === '\n') {
      row.push(field)
      field = ''
      table.push(row)
      row = []
      hasData = false
    } else {
      field += ch
      hasData = true
    }
  }
  if (inQuotes) throw new Error('CSV 引号未闭合')
  if (hasData || row.length > 0) {
    row.push(field)
    table.push(row)
  }
  const nonEmpty = table.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmpty.length === 0) throw new Error('CSV 为空，至少需要表头行')
  const headers = nonEmpty[0]
  if (headers.some((h) => h.trim() === '')) throw new Error('表头不能为空')
  return { headers, rows: nonEmpty.slice(1) }
}

/** 支持的运算符 */
export const OPERATORS = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  '包含',
  '不包含',
  '开头',
  '结尾',
  '为空',
  '不为空',
] as const

export type Operator = (typeof OPERATORS)[number]

export interface Condition {
  column: string
  op: Operator
  value: string
}

/**
 * 解析单条条件：`列名 运算符 值`（以空白分隔；列名与值内部可含空格；
 * 为空 / 不为空可省略值）。
 */
export function parseCondition(line: string, lineNo: number): Condition {
  const trimmed = line.trim()
  if (trimmed === '') throw new Error(`第 ${lineNo} 个条件为空`)
  const opSet = new Set<string>(OPERATORS)
  const tokens = trimmed.split(/\s+/)
  const opIdx = tokens.findIndex((t) => opSet.has(t))
  if (opIdx <= 0) {
    throw new Error(`第 ${lineNo} 个条件格式错误，应为「列名 运算符 值」，如：年龄 > 30`)
  }
  const op = tokens[opIdx] as Operator
  const column = tokens.slice(0, opIdx).join(' ')
  const value = tokens.slice(opIdx + 1).join(' ')
  if (op === '为空' || op === '不为空') {
    if (value !== '') throw new Error(`第 ${lineNo} 个条件：「${op}」不需要值`)
  } else if (value === '') {
    throw new Error(`第 ${lineNo} 个条件：「${op}」需要一个值`)
  }
  return { column, op, value }
}

/** 解析多行条件文本，空行跳过 */
export function parseConditions(text: string): Condition[] {
  const lines = text.split('\n')
  const conds: Condition[] = []
  lines.forEach((line, i) => {
    if (line.trim() === '') return
    conds.push(parseCondition(line, i + 1))
  })
  if (conds.length === 0) throw new Error('至少需要 1 个过滤条件')
  if (conds.length > 20) throw new Error('最多支持 20 个条件')
  return conds
}

/** 数字感知比较：两边都是数字字符串时按数值比，否则按字符串比 */
function compareValues(cell: string, value: string): number {
  const c = cell.trim()
  const v = value.trim()
  const cNum = c !== '' && Number.isFinite(Number(c))
  const vNum = v !== '' && Number.isFinite(Number(v))
  if (cNum && vNum) return Number(c) - Number(v)
  if (c === v) return 0
  return c < v ? -1 : 1
}

/** 单条条件是否命中 */
export function matchCondition(cell: string, cond: Condition): boolean {
  const c = cell ?? ''
  switch (cond.op) {
    case '=':
      return compareValues(c, cond.value) === 0
    case '!=':
      return compareValues(c, cond.value) !== 0
    case '>':
      return compareValues(c, cond.value) > 0
    case '>=':
      return compareValues(c, cond.value) >= 0
    case '<':
      return compareValues(c, cond.value) < 0
    case '<=':
      return compareValues(c, cond.value) <= 0
    case '包含':
      return c.includes(cond.value)
    case '不包含':
      return !c.includes(cond.value)
    case '开头':
      return c.startsWith(cond.value)
    case '结尾':
      return c.endsWith(cond.value)
    case '为空':
      return c.trim() === ''
    case '不为空':
      return c.trim() !== ''
  }
}

export type Logic = 'AND' | 'OR'

/** 解析 AND/OR（默认 AND） */
export function parseLogic(raw: string): Logic {
  const v = raw.trim().toUpperCase()
  if (v === '' || v === 'AND') return 'AND'
  if (v === 'OR') return 'OR'
  throw new Error(`条件关系须为 AND 或 OR，当前为：${raw.trim()}`)
}

/**
 * 多条件过滤：条件中的列名必须存在于表头；
 * 命中规则按 logic（AND 全部命中 / OR 任一命中）。
 */
export function applyFilters(
  headers: string[],
  rows: Row[],
  conds: Condition[],
  logic: Logic,
): Row[] {
  const colIndex = new Map(headers.map((h, i) => [h, i]))
  for (const cond of conds) {
    if (!colIndex.has(cond.column)) {
      throw new Error(`列「${cond.column}」不存在于表头`)
    }
  }
  return rows.filter((row) =>
    logic === 'AND'
      ? conds.every((cond) => matchCondition(row[colIndex.get(cond.column)!] ?? '', cond))
      : conds.some((cond) => matchCondition(row[colIndex.get(cond.column)!] ?? '', cond)),
  )
}

/** 导出 CSV（字段含逗号 / 引号 / 换行时加引号并转义） */
export function toCsv(headers: string[], rows: Row[]): string {
  const esc = (c: string): string => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}
