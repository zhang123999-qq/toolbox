import * as XLSX from 'xlsx'

/**
 * 本文件只放纯函数：文件校验、源格式识别、xlsx/csv/json 互转。
 * xlsx 允许静态导入（Excel 工具同款例外）；mammoth 的 docx 解析是重型
 * 动态加载，放在 Tool.tsx。所有抛错均为中文。
 */

/** 单文件上限：50 MiB */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export type SourceType = 'docx' | 'xlsx' | 'csv' | 'json'
export type TargetFormat = 'txt' | 'html' | 'md' | 'json' | 'csv' | 'xlsx'

export interface TargetOption {
  readonly value: TargetFormat
  readonly label: string
}

/** 转换矩阵：源格式 → 可达目标格式 */
export const CONVERSION_MATRIX: Record<SourceType, readonly TargetOption[]> = {
  docx: [
    { value: 'txt', label: '纯文本 (.txt)' },
    { value: 'html', label: '网页 (.html)' },
    { value: 'md', label: 'Markdown (.md)' },
  ],
  xlsx: [
    { value: 'json', label: 'JSON (.json)' },
    { value: 'csv', label: 'CSV (.csv，取首个工作表)' },
    { value: 'md', label: 'Markdown (.md)' },
  ],
  csv: [
    { value: 'json', label: 'JSON (.json)' },
    { value: 'md', label: 'Markdown (.md)' },
    { value: 'xlsx', label: 'Excel (.xlsx)' },
  ],
  json: [
    { value: 'csv', label: 'CSV (.csv)' },
    { value: 'xlsx', label: 'Excel (.xlsx)' },
  ],
}

const MIME: Record<TargetFormat, string> = {
  txt: 'text/plain;charset=utf-8',
  html: 'text/html;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
  json: 'application/json;charset=utf-8',
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

/** 目标格式 → 下载 mime */
export function mimeOf(target: TargetFormat): string {
  return MIME[target]
}

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

/** 按扩展名识别源格式；不支持时抛中文错误（旧版 .doc 给专门提示） */
export function detectSourceType(fileName: string): SourceType {
  if (/\.docx$/i.test(fileName)) return 'docx'
  if (/\.xlsx$/i.test(fileName) || /\.xls$/i.test(fileName)) return 'xlsx'
  if (/\.csv$/i.test(fileName)) return 'csv'
  if (/\.json$/i.test(fileName)) return 'json'
  if (/\.doc$/i.test(fileName)) {
    throw new Error('暂不支持旧版 .doc 格式，请先另存为 .docx 后再转换')
  }
  throw new Error(
    `不支持的文件类型（当前文件：${fileName === '' ? '未知' : fileName}），请选择 .docx / .xlsx / .csv / .json`,
  )
}

/** 校验上传的文件：扩展名 / 空文件 / 体积 */
export function assertConvertFile(file: { readonly name: string; readonly size: number }): void {
  detectSourceType(file.name)
  if (file.size === 0) throw new Error('文件为空，请选择有效的文档')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限`)
  }
}

/** Uint8Array → base64（分块避免大数组展开爆栈） */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
  }
  return btoa(parts.join(''))
}

/** 'a.b.docx' → 'a.b'；无扩展名时原样返回 */
export function baseName(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx > 0 ? fileName.slice(0, idx) : fileName
}

/** Uint8Array → 精确大小的 ArrayBuffer（mammoth 要求） */
export function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

/** xlsx(zip) / xls(OLE) 魔数校验；不通过抛中文错误 */
function assertSpreadsheetMagic(bytes: Uint8Array): void {
  const isZip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  const isOle =
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  if (!isZip && !isOle) throw new Error('表格解析失败：不是有效的 Excel 文件（.xlsx / .xls）')
}

/** 解析 xlsx/xls 字节为工作簿；失败抛中文错误 */
export function readWorkbook(bytes: Uint8Array): XLSX.WorkBook {
  assertSpreadsheetMagic(bytes)
  try {
    return XLSX.read(bytes, { type: 'array' })
  } catch {
    throw new Error('表格解析失败：文件可能已损坏或不是有效的 Excel 文件')
  }
}

/** 工作簿非空校验：无工作表时抛中文错误 */
function assertHasSheets(workbook: XLSX.WorkBook): void {
  if (workbook.SheetNames.length === 0) throw new Error('工作簿中没有工作表')
}

/** 工作表 → 二维数组（首行为表头，空单元格补 null） */
function sheetRows(workbook: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = workbook.Sheets[name]
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true })
}

/** xlsx → JSON：{ 工作表名: 行数组 }，空表为 [] */
export function workbookToJson(workbook: XLSX.WorkBook): string {
  assertHasSheets(workbook)
  const result: Record<string, unknown[][]> = {}
  for (const name of workbook.SheetNames) {
    result[name] = sheetRows(workbook, name)
  }
  return JSON.stringify(result, null, 2)
}

/** xlsx → CSV：取首个工作表（CSV 为单表格式） */
export function workbookToCsv(workbook: XLSX.WorkBook): string {
  assertHasSheets(workbook)
  const first = workbook.SheetNames[0] as string
  return XLSX.utils.sheet_to_csv(workbook.Sheets[first] as XLSX.WorkSheet)
}

/** 单元格转 Markdown：null → 空串，管道转义，换行转 <br/> */
function mdCell(cell: unknown): string {
  return String(cell ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r\n/g, '<br/>')
    .replace(/[\r\n]/g, '<br/>')
}

/** 过滤全空行（单元格全为 null / undefined / 空白串） */
function nonEmptyRows(rows: readonly unknown[][]): unknown[][] {
  return rows.filter((row) =>
    row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''),
  )
}

/** 非空二维数组 → Markdown 表格（调用方保证 rows 非空） */
export function markdownTable(rows: readonly unknown[][]): string {
  const header = rows[0] as unknown[]
  const lines = [
    `| ${header.map(mdCell).join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
  ]
  for (const row of rows.slice(1)) {
    const cells = header.map((_, i) => mdCell(row[i]))
    lines.push(`| ${cells.join(' | ')} |`)
  }
  return lines.join('\n')
}

/** xlsx → Markdown：每工作表一节，空表标注（空表） */
export function workbookToMarkdown(workbook: XLSX.WorkBook): string {
  assertHasSheets(workbook)
  const sections: string[] = []
  for (const name of workbook.SheetNames) {
    const rows = nonEmptyRows(sheetRows(workbook, name))
    sections.push(
      rows.length === 0 ? `## ${name}\n\n（空表）` : `## ${name}\n\n${markdownTable(rows)}`,
    )
  }
  return sections.join('\n\n')
}

/** csv 文本 → JSON（首个工作表转对象数组）；空 CSV 得 [] */
export function csvTextToJson(csvText: string): string {
  const workbook = readCsvText(csvText)
  const first = workbook.SheetNames[0] as string
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[first] as XLSX.WorkSheet, { defval: null })
  return JSON.stringify(rows, null, 2)
}

/** csv 文本 → Markdown 表格；空 CSV 得（空表） */
export function csvTextToMarkdown(csvText: string): string {
  const workbook = readCsvText(csvText)
  const first = workbook.SheetNames[0] as string
  const rows = nonEmptyRows(sheetRows(workbook, first))
  return rows.length === 0 ? '（空表）' : markdownTable(rows)
}

/** 解析 csv 文本为工作簿（CSV 为纯文本，解析基本不会失败） */
function readCsvText(csvText: string): XLSX.WorkBook {
  return XLSX.read(csvText, { type: 'string' })
}

/** csv 文本 → xlsx 字节 */
export function csvTextToXlsxBytes(csvText: string): Uint8Array {
  const workbook = readCsvText(csvText)
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
}

/** JSON 文本 → 行数组：顶层必须是非空元素为对象的数组 */
function parseJsonRows(jsonText: string): unknown[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('JSON 解析失败：不是有效的 JSON 文本')
  }
  if (!Array.isArray(parsed)) throw new Error('JSON 顶层必须是数组（如 [{"a": 1}]）')
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('JSON 数组元素必须是对象（如 {"a": 1}），暂不支持其它形状')
    }
  }
  return parsed
}

/** json 文本 → CSV */
export function jsonTextToCsv(jsonText: string): string {
  const rows = parseJsonRows(jsonText)
  const sheet = XLSX.utils.json_to_sheet(rows)
  return XLSX.utils.sheet_to_csv(sheet)
}

/** json 文本 → xlsx 字节 */
export function jsonTextToXlsxBytes(jsonText: string): Uint8Array {
  const rows = parseJsonRows(jsonText)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Sheet1')
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
}
