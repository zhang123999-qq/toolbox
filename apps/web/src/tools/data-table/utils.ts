/**
 * data-table（#688）工具函数：CSV 解析 / 排序 / 搜索 / 分页 / 导出。
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

/** 判断字符串是否为数字（支持小数与负数） */
function isNumeric(s: string): boolean {
  return s.trim() !== '' && Number.isFinite(Number(s))
}

/** 比较两个单元格：数字感知，数字 < 非数字？不——数字按数值比，否则按中文 locale 比 */
export function compareCells(a: string, b: string): number {
  const aNum = isNumeric(a)
  const bNum = isNumeric(b)
  if (aNum && bNum) return Number(a) - Number(b)
  if (aNum !== bNum) return aNum ? -1 : 1
  return a.localeCompare(b, 'zh')
}

export type SortDir = 'asc' | 'desc' | null

/** 按列排序（稳定排序，不改变原数组；空值永远置后） */
export function sortRows(rows: Row[], col: number, dir: SortDir): Row[] {
  if (dir === null) return rows.slice()
  const indexed = rows.map((r, i) => ({ r, i }))
  indexed.sort((x, y) => {
    const a = (x.r[col] ?? '').trim()
    const b = (y.r[col] ?? '').trim()
    const aEmpty = a === ''
    const bEmpty = b === ''
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1
    const c = compareCells(x.r[col] ?? '', y.r[col] ?? '')
    if (c !== 0) return dir === 'asc' ? c : -c
    return x.i - y.i
  })
  return indexed.map((e) => e.r)
}

/** 全局关键词搜索（任意单元格包含，不区分大小写） */
export function filterRows(rows: Row[], keyword: string): Row[] {
  const kw = keyword.trim().toLowerCase()
  if (kw === '') return rows.slice()
  return rows.filter((r) => r.some((c) => c.toLowerCase().includes(kw)))
}

/** 分页：返回当页数据与总页数（页码从 1 开始，越界钳制） */
export function paginate(
  rows: Row[],
  page: number,
  pageSize: number,
): { pageRows: Row[]; totalPages: number; page: number } {
  const size = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(Math.max(1, Math.floor(page)), totalPages)
  return { pageRows: rows.slice((p - 1) * size, p * size), totalPages, page: p }
}

/** 解析每页条数（正整数，默认 10，上限 500） */
export function parsePageSize(raw: string): number {
  const v = raw.trim()
  if (v === '') return 10
  if (!/^\d+$/.test(v)) throw new Error(`每页条数须为正整数，当前为：${v}`)
  const n = Number(v)
  if (n < 1 || n > 500) throw new Error(`每页条数须在 1–500 之间，当前为：${n}`)
  return n
}

/** 导出 CSV（字段含逗号 / 引号 / 换行时加引号并转义） */
export function toCsv(headers: string[], rows: Row[]): string {
  const esc = (c: string): string => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}
