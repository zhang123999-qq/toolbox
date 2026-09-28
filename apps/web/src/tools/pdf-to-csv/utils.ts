/**
 * pdf-to-csv 纯函数：PDF 文本项 → 行列启发式 → CSV。
 *
 * 不依赖 pdfjs-dist（文本项由 Tool.tsx 从 getTextContent() 映射为 PdfCellItem），
 * 因此本文件可被 vitest 完整覆盖（目标：语句 / 分支 / 函数 / 行 100%）。
 *
 * 列识别原理：同一列的文本项 x 坐标聚类；同一行的 y 坐标聚类。
 * CSV 转义遵循 RFC 4180，并加了公式注入防护（= + - @ 开头加单引号前缀）。
 */

import type { PdfToCsvOptions } from './schema'

/** pdfjs 文本项的最小投影（Tool.tsx 里从 TextContent 映射） */
export interface PdfCellItem {
  readonly str: string
  /** PDF 用户空间坐标（点）；y 向上为正 */
  readonly x: number
  readonly y: number
}

/** PDF 文件的最小信息子集（File 的结构化替身，便于单元测试） */
export interface PdfFileInfo {
  readonly name: string
  readonly size: number
  readonly type: string
}

/** 分隔符选项值 → 实际字符 */
export type CsvDelimiterOption = PdfToCsvOptions['delimiter']

/** 页数上限：文本提取是纯 CPU 活，50 页以上提示拆分 */
export const MAX_PDF_PAGES = 50

/** 文件体积上限：100 MiB */
export const MAX_PDF_BYTES = 100 * 1024 * 1024

/** 列聚类的 x 容差（PDF 点）：同一列的左对齐漂移一般 < 5pt */
const COLUMN_X_TOLERANCE = 5

/** 行聚类的 y 容差（PDF 点） */
const ROW_Y_TOLERANCE = 2.5

/** 文件前置校验：类型 / 空文件 / 体积；不合法直接抛中文错误 */
export function validatePdfFile(file: PdfFileInfo): void {
  if (file.size === 0) {
    throw new Error('文件为空，请选择有效的 PDF 文件')
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`文件过大：${(file.size / 1024 / 1024).toFixed(1)} MiB，超过 100 MiB 上限`)
  }
  const name = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
  if (!isPdf) {
    throw new Error('请选择 PDF 文件（.pdf），当前文件不是 PDF 格式')
  }
}

/** 页数校验：0 页视为损坏；超 50 页拒绝并提示拆分 */
export function checkPdfPageCount(total: number): void {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error('无法读取 PDF 页数，文件可能已损坏')
  }
  if (total > MAX_PDF_PAGES) {
    throw new Error(`PDF 共 ${total} 页，超过 ${MAX_PDF_PAGES} 页上限，请拆分后分批转换`)
  }
}

/** 是否为 pdfjs 抛出的「需要密码」错误 */
export function isPasswordError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    if ((error as { name?: unknown }).name === 'PasswordException') return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return /password/i.test(message)
}

/** PDF 加载阶段的错误 → 中文提示（加密 / 损坏 / 其他） */
export function describePdfLoadError(error: unknown): string {
  if (isPasswordError(error)) {
    return '该 PDF 已加密，不支持提取文本，请先去除密码后重试'
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/invalid pdf|not a pdf|corrupt|损坏/i.test(message)) {
    return '文件损坏或不是有效的 PDF 文件，请检查后重试'
  }
  return `PDF 加载失败：${message}`
}

/** 选项值 → 实际分隔字符 */
export function resolveDelimiter(delimiter: CsvDelimiterOption): string {
  return delimiter === 'tab' ? '\t' : delimiter
}

/**
 * 列边界检测：所有文本项的 x 排序后聚类，相邻 x 差 > 容差则开新列；
 * 返回每列的左边界（升序）。
 */
export function detectColumnEdges(items: readonly PdfCellItem[]): number[] {
  const xs = items.map((item) => item.x).sort((a, b) => a - b)
  const edges: number[] = []
  for (const x of xs) {
    const last = edges[edges.length - 1]
    if (last === undefined || x - last > COLUMN_X_TOLERANCE) {
      edges.push(x)
    }
  }
  return edges
}

/** x 归属哪一列：取 ≤ x + 容差/2 的最右边界；全都不满足则归第 0 列 */
function columnIndex(x: number, edges: readonly number[]): number {
  let idx = 0
  // 边界升序：不满足 once 则后续更大边界必然也不满足，故等价于取最右满足者
  for (const [i, edge] of edges.entries()) {
    if (x >= edge - COLUMN_X_TOLERANCE / 2) idx = i
  }
  return idx
}

/**
 * 文本项 → 二维行：先按 y 聚行（降序），行内按 x 排序后按列边界归位；
 * 同一格多个项用空格连接；行尾空单元格截掉；全空行丢弃。
 */
export function itemsToRows(items: readonly PdfCellItem[], edges: readonly number[]): string[][] {
  const kept = items.filter((item) => item.str !== '')
  if (kept.length === 0 || edges.length === 0) return []
  const sorted = [...kept].sort((a, b) => (b.y !== a.y ? b.y - a.y : a.x - b.x))
  const rows: string[][] = []
  let current: PdfCellItem[] = []
  let rowY = 0
  const flush = () => {
    // 调用方保证 current 非空（kept 为空时已提前返回）
    const cells: string[] = new Array(edges.length).fill('')
    for (const it of [...current].sort((a, b) => a.x - b.x)) {
      const col = columnIndex(it.x, edges)
      cells[col] = cells[col] === '' ? it.str : cells[col] + ' ' + it.str
    }
    // 截掉行尾空单元格；current 非空故至少有一格非空
    let end = cells.length
    while (end > 0 && cells[end - 1] === '') end -= 1
    rows.push(cells.slice(0, end))
    current = []
  }
  for (const it of sorted) {
    if (current.length === 0 || Math.abs(it.y - rowY) <= ROW_Y_TOLERANCE) {
      if (current.length === 0) rowY = it.y
      current.push(it)
    } else {
      flush()
      rowY = it.y
      current.push(it)
    }
  }
  flush()
  return rows
}

/**
 * 单个单元格转义（RFC 4180 + 公式注入防护）：
 * 1. 以 = + - @ 开头 → 前缀单引号（防 Excel 公式注入）；
 * 2. 含分隔符 / 双引号 / 换行 → 整体加双引号，内部双引号翻倍。
 */
export function escapeCsvCell(cell: string, delimiter: string): string {
  let out = cell
  if (/^[=+\-@]/.test(out)) out = "'" + out
  if (out.includes(delimiter) || out.includes('"') || out.includes('\n') || out.includes('\r')) {
    out = '"' + out.replace(/"/g, '""') + '"'
  }
  return out
}

/** 二维行 → CSV 文本（行间 \r\n，RFC 4180） */
export function rowsToCsv(rows: ReadonlyArray<readonly string[]>, delimiter: string): string {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter))
    .join('\r\n')
}

/** 整篇断言：所有页都没文字 → 抛错并建议用 #500 OCR */
export function assertPagesHaveText(pages: ReadonlyArray<readonly PdfCellItem[]>): void {
  const totalChars = pages.reduce(
    (sum, items) => sum + items.reduce((s, item) => s + item.str.trim().length, 0),
    0,
  )
  if (totalChars === 0) {
    throw new Error('PDF 中没有可提取的文字（可能是扫描版），建议使用 #500「PDF 文字识别（OCR）」')
  }
}

/**
 * 多页 → CSV：每页独立检测列（各页版式可能不同），行直接拼接；
 * 空页跳过（不输出空行）。
 */
export function pdfToCsv(
  pages: ReadonlyArray<readonly PdfCellItem[]>,
  delimiter: CsvDelimiterOption,
): string {
  assertPagesHaveText(pages)
  const sep = resolveDelimiter(delimiter)
  const allRows: string[][] = []
  for (const items of pages) {
    const kept = items.filter((item) => item.str !== '')
    if (kept.length === 0) continue
    const edges = detectColumnEdges(kept)
    allRows.push(...itemsToRows(kept, edges))
  }
  return rowsToCsv(allRows, sep)
}
