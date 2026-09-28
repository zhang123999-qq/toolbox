/**
 * pdf-to-excel 纯函数：文件校验（魔数/大小）、加密识别、
 * 文本按坐标分行分列、xlsx 工作簿构建。
 * 不触碰 React/DOM；pdfjs-dist 与 xlsx 均为纯 JS，可 100% 单测。
 */
import * as XLSX from 'xlsx'
import { PasswordException } from 'pdfjs-dist'

/**
 * getTextContent 条目的最小结构子集（pdfjs-dist 未从入口导出 TextItem/TextMarkedContent 类型）：
 * 文本片段 { str, transform, width, height }，或无 str 的 marked content。
 */
export type TextContentItem =
  | { str: string; transform: readonly number[]; width: number; height: number }
  | { type: string; id: string }

/**
 * 带坐标的文本片段：从 pdfjs TextItem 提取的纯数据子集，
 * 分行分列只依赖这份数据，与 pdfjs 运行时解耦。
 */
export interface CellItem {
  /** 文本内容 */
  str: string
  /** 横坐标 = transform[4] */
  x: number
  /** 纵坐标 = transform[5]（PDF 坐标系，向上为正） */
  y: number
  /** 片段宽度（PDF 单位） */
  width: number
  /** 片段高度（PDF 单位） */
  height: number
}

/** 工作表模式：merged 合并为一张表 / perPage 每页一张工作表 */
export type SheetMode = 'merged' | 'perPage'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 生成的 .xlsx MIME */
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * 分行分列的启发式阈值（PDF 单位，常规 10–12pt 正文）：
 * - 同行判定：纵坐标差 ≤ ROW_Y_TOLERANCE 视为同一行；
 * - 列切分：横向间隙 > COLUMN_GAP_THRESHOLD 视为列分隔（词间距约 2–4）；
 * - 词内拼接：间隙 ≤ WORD_JOIN_GAP 视为同一词被 pdfjs 拆分，直接拼接不加空格。
 */
export const ROW_Y_TOLERANCE = 2
export const COLUMN_GAP_THRESHOLD = 10
export const WORD_JOIN_GAP = 1.5

/** 列宽钳制（字符数）：太窄看不清，太宽浪费 */
export const MIN_COLUMN_WIDTH = 8
export const MAX_COLUMN_WIDTH = 50

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为可转换的 PDF。
 */
export function isPdfFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 是否为 pdfjs-dist 抛出的加密 PDF 错误（PasswordException）。
 * 名称兜底：跨 realm / 模块 mock 场景下 instanceof 可能失效。
 */
export function isEncryptedPdfError(err: unknown): boolean {
  return (
    err instanceof PasswordException || (err instanceof Error && err.name === 'PasswordException')
  )
}

/** 有限正数才采用，否则用兜底（分支两侧均有单测） */
function finitePositiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/**
 * pdfjs getTextContent 的 items → 带坐标的文本片段：
 * - 跳过无 str 的 marked content；
 * - 跳过空字符串片段（零宽占位，不贡献单元格内容）；
 * - x/y 取 transform[4]/[5]；width/height 缺失或非法时按字数估算兜底。
 */
export function extractCellItems(items: readonly TextContentItem[]): CellItem[] {
  const cells: CellItem[] = []
  for (const item of items) {
    if (!('str' in item)) continue
    if (item.str === '') continue
    const t = item.transform
    cells.push({
      str: item.str,
      x: t[4] ?? 0,
      y: t[5] ?? 0,
      width: finitePositiveOr(item.width, Math.max(1, item.str.length * 5)),
      height: finitePositiveOr(item.height, 10),
    })
  }
  return cells
}

/**
 * 按坐标把文本片段排成二维表：
 * - 按 y 降序（PDF y 向上）分组为行，输出即阅读顺序（从上到下）；
 * - 行内按 x 升序，用横向间隙切分列：大间隙另起一列，
 *   词间距加一个空格拼接，词内拆分直接拼接；
 * - 整行全为空白则丢弃（空白行不进 Excel）。
 */
export function groupItemsToRows(items: readonly CellItem[]): string[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rowGroups: CellItem[][] = []
  for (const item of sorted) {
    const last = rowGroups[rowGroups.length - 1]
    const first = last?.[0]
    if (first !== undefined && Math.abs(item.y - first.y) <= ROW_Y_TOLERANCE) {
      last.push(item)
    } else {
      rowGroups.push([item])
    }
  }
  const rows: string[][] = []
  for (const group of rowGroups) {
    // 组恒非空（创建时即带一个元素），首个片段直接作为当前单元格起点
    const ordered = [...group].sort((a, b) => a.x - b.x)
    const cells: string[] = []
    let current = ''
    let cursorX = 0
    ordered.forEach((item, index) => {
      if (index === 0) {
        current = item.str
      } else {
        const gap = item.x - cursorX
        if (gap > COLUMN_GAP_THRESHOLD) {
          cells.push(current)
          current = item.str
        } else if (gap > WORD_JOIN_GAP) {
          current += ` ${item.str}`
        } else {
          current += item.str
        }
      }
      cursorX = item.x + item.width
    })
    cells.push(current)
    if (cells.some((cell) => cell.trim() !== '')) rows.push(cells)
  }
  return rows
}

/**
 * 列宽估计：每列取最大字符数（按 code point 计），钳制在
 * [MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH]；空表返回空数组。
 */
export function computeColumnWidths(rows: readonly (readonly string[])[]): number[] {
  const widths: number[] = []
  for (const row of rows) {
    row.forEach((cell, index) => {
      const len = [...cell].length
      if (len > (widths[index] ?? 0)) widths[index] = len
    })
  }
  return widths.map((w) => Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, w)))
}

/** 构造输出文件名：原名 + -converted.xlsx */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-converted.xlsx`
}

/**
 * 由各页二维表构建 .xlsx Blob（xlsx 社区版写入能力）：
 * - merged：所有页拼入一张工作表（Sheet1），非空页之间插一个空行分隔；
 * - perPage：每页一张工作表，命名"第1页"、"第2页"…；
 * 列宽按内容估计写入（社区版支持 !cols；单元格样式不支持，见 README）。
 */
export function buildXlsxBlob(pages: string[][][], sheetMode: SheetMode): Blob {
  const wb = XLSX.utils.book_new()
  if (sheetMode === 'merged') {
    const rows: string[][] = []
    pages.forEach((pageRows, pageIndex) => {
      if (pageIndex > 0 && pageRows.length > 0 && rows.length > 0) rows.push([])
      rows.push(...pageRows)
    })
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = computeColumnWidths(rows).map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  } else {
    pages.forEach((pageRows, pageIndex) => {
      const ws = XLSX.utils.aoa_to_sheet(pageRows)
      ws['!cols'] = computeColumnWidths(pageRows).map((wch) => ({ wch }))
      XLSX.utils.book_append_sheet(wb, ws, `第${pageIndex + 1}页`)
    })
  }
  const bytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }))
  return new Blob([bytes], { type: XLSX_MIME })
}
