/**
 * data-sort（#690）工具函数：CSV 解析 / 排序规则解析 / 稳定多列排序。
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

export const EXAMPLE_SPEC = ['年龄:desc', '销售额:asc'].join('\n')

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

export type SortDir = 'asc' | 'desc'

export interface SortRule {
  column: string
  dir: SortDir
}

/** 解析单条排序规则：`列名:asc|desc`（方向缺省为 asc） */
export function parseSortRule(line: string, lineNo: number): SortRule {
  const trimmed = line.trim()
  if (trimmed === '') throw new Error(`第 ${lineNo} 条规则为空`)
  const idx = trimmed.lastIndexOf(':')
  let column: string
  let dirRaw: string
  if (idx < 0) {
    column = trimmed
    dirRaw = 'asc'
  } else {
    column = trimmed.slice(0, idx).trim()
    dirRaw = trimmed
      .slice(idx + 1)
      .trim()
      .toLowerCase()
  }
  if (column === '') throw new Error(`第 ${lineNo} 条规则列名为空`)
  if (dirRaw !== 'asc' && dirRaw !== 'desc') {
    throw new Error(
      `第 ${lineNo} 条规则方向须为 asc 或 desc，当前为：${trimmed.slice(idx + 1).trim() || '（空）'}`,
    )
  }
  return { column, dir: dirRaw }
}

/** 解析多行排序规则，空行跳过 */
export function parseSortSpec(text: string): SortRule[] {
  const rules: SortRule[] = []
  text.split('\n').forEach((line, i) => {
    if (line.trim() === '') return
    rules.push(parseSortRule(line, i + 1))
  })
  if (rules.length === 0) throw new Error('至少需要 1 条排序规则')
  if (rules.length > 10) throw new Error('最多支持 10 条排序规则')
  const seen = new Set<string>()
  for (const r of rules) {
    if (seen.has(r.column)) throw new Error(`列「${r.column}」重复出现在排序规则中`)
    seen.add(r.column)
  }
  return rules
}

/** 判断是否为数字字符串 */
function isNumeric(s: string): boolean {
  return s.trim() !== '' && Number.isFinite(Number(s))
}

/**
 * 比较两个单元格：空值永远置后；数字按数值比；
 * 一边数字一边文本时数字在前；否则中文 locale 比。
 */
export function compareCells(a: string, b: string): number {
  const ca = (a ?? '').trim()
  const cb = (b ?? '').trim()
  const aEmpty = ca === ''
  const bEmpty = cb === ''
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1
  if (aEmpty && bEmpty) return 0
  const aNum = isNumeric(ca)
  const bNum = isNumeric(cb)
  if (aNum && bNum) return Number(ca) - Number(cb)
  if (aNum !== bNum) return aNum ? -1 : 1
  return ca.localeCompare(cb, 'zh')
}

/**
 * 稳定多列排序：按规则先后依次比较，全部相等时保持原相对顺序。
 * 规则中的列必须存在于表头。
 */
export function multiSortRows(headers: string[], rows: Row[], rules: SortRule[]): Row[] {
  const colIndex = new Map(headers.map((h, i) => [h, i]))
  for (const r of rules) {
    if (!colIndex.has(r.column)) throw new Error(`列「${r.column}」不存在于表头`)
  }
  const indexed = rows.map((row, i) => ({ row, i }))
  indexed.sort((x, y) => {
    for (const rule of rules) {
      const ci = colIndex.get(rule.column)!
      const c = compareCells(x.row[ci] ?? '', y.row[ci] ?? '')
      if (c !== 0) return rule.dir === 'asc' ? c : -c
    }
    return x.i - y.i
  })
  return indexed.map((e) => e.row)
}

/** 导出 CSV（字段含逗号 / 引号 / 换行时加引号并转义） */
export function toCsv(headers: string[], rows: Row[]): string {
  const esc = (c: string): string => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}
