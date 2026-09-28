import * as XLSX from 'xlsx'
import type { ExcelToMarkdownOptions } from './schema'

/** 单文件上限：50 MiB */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

/** 字节数转人类可读：1536 → "1.50 KiB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}

/** 校验上传的文件：扩展名 / 空文件 / 体积；不合法抛中文错误 */
export function assertWorkbookFile(file: { readonly name: string; readonly size: number }): void {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error(
      `请选择 Excel 文件（.xlsx / .xls / .csv，当前文件：${file.name === '' ? '未知' : file.name}）`,
    )
  }
  if (file.size === 0) throw new Error('文件为空，请选择有效的 Excel 文件')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限`)
  }
}

/** 读工作簿：空字节与解析失败都转中文错误 */
function readWorkbook(bytes: Uint8Array): XLSX.WorkBook {
  if (bytes.length === 0) throw new Error('文件为空，请选择有效的 Excel 文件')
  try {
    return XLSX.read(bytes, { type: 'array' })
  } catch {
    throw new Error('文件解析失败：不是有效的 Excel 文件（支持 .xlsx / .xls / .csv）')
  }
}

/** 单元格转义：管道符与换行会破坏 Markdown 表格 */
export function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>')
}

/**
 * 单张工作表 → Markdown 表格（首行为表头）。
 * raw:false 取单元格的显示文本；空表返回空串（由调用方标「空表」）。
 */
export function sheetToMarkdown(ws: XLSX.WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][]
  if (rows.length === 0) return ''
  const cells = rows.map((row) => row.map((cell) => escapeCell(String(cell))))
  const width = Math.max(...cells.map((r) => r.length))
  const pad = (r: string[]): string[] => r.concat(Array(width - r.length).fill(''))
  const lines = cells.map((r) => `| ${pad(r).join(' | ')} |`)
  lines.splice(1, 0, `| ${Array(width).fill('---').join(' | ')} |`)
  return lines.join('\n')
}

/**
 * 工作簿字节 → Markdown 文本。
 * sheet 留空：每表一段 `## 表名`；指定表名：只输出该表。
 */
export function workbookBytesToMarkdown(
  bytes: Uint8Array,
  options: ExcelToMarkdownOptions,
): string {
  const wb = readWorkbook(bytes)
  if (wb.SheetNames.length === 0) throw new Error('工作簿中没有工作表')
  const name = options.sheet.trim()
  const names = name === '' ? wb.SheetNames : [name]
  const sections = names.map((sheetName) => {
    const ws = wb.Sheets[sheetName]
    if (ws == null) {
      throw new Error(`工作表「${sheetName}」不存在，现有工作表：${wb.SheetNames.join('、')}`)
    }
    const table = sheetToMarkdown(ws)
    return `## ${sheetName}\n\n${table === '' ? '（空表）' : table}`
  })
  return sections.join('\n\n') + '\n'
}

/** 文件入口：校验 → 读字节 → 转 Markdown */
export async function workbookFileToMarkdown(
  file: File,
  options: ExcelToMarkdownOptions,
): Promise<string> {
  assertWorkbookFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  return workbookBytesToMarkdown(bytes, options)
}
