import * as XLSX from 'xlsx'

/** 单文件上限：50 MiB */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

/** 预览行列上限：超出的部分截断并提示（避免超大表格卡死渲染） */
export const MAX_PREVIEW_ROWS = 1000
export const MAX_PREVIEW_COLS = 50

export interface SheetPreview {
  readonly name: string
  /** 截断后的行（每格已转为显示文本） */
  readonly rows: ReadonlyArray<ReadonlyArray<string>>
  /** 表格实际总行数（含被截掉的） */
  readonly totalRows: number
  /** 行数是否被截断 */
  readonly truncated: boolean
}

export interface WorkbookPreview {
  readonly fileName: string
  readonly sheets: readonly SheetPreview[]
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

/** 列序号 → Excel 列标：0→A，25→Z，26→AA */
export function columnLabel(index: number): string {
  let label = ''
  let n = index
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

/** 单张工作表 → 预览模型（取显示文本，超限截断） */
function buildSheetPreview(name: string, ws: XLSX.WorkSheet): SheetPreview {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][]
  const totalRows = aoa.length
  const truncated = totalRows > MAX_PREVIEW_ROWS
  const rows = aoa
    .slice(0, MAX_PREVIEW_ROWS)
    .map((row) => row.slice(0, MAX_PREVIEW_COLS).map((cell) => String(cell)))
  return { name, rows, totalRows, truncated }
}

/** 工作簿字节 → 预览模型（含全部工作表） */
export function parseWorkbookPreview(bytes: Uint8Array, fileName: string): WorkbookPreview {
  const wb = readWorkbook(bytes)
  if (wb.SheetNames.length === 0) throw new Error('工作簿中没有工作表')
  const sheets = wb.SheetNames.map((name) =>
    buildSheetPreview(name, wb.Sheets[name] as XLSX.WorkSheet),
  )
  return { fileName, sheets }
}

/** 预览模型 → 可复制/下载的 TSV 文本 */
export function previewToText(preview: WorkbookPreview): string {
  const parts: string[] = [`工作簿：${preview.fileName}（${preview.sheets.length} 个工作表）`]
  for (const sheet of preview.sheets) {
    parts.push(
      '',
      `## ${sheet.name}（共 ${sheet.totalRows} 行${sheet.truncated ? '，仅显示前 1000 行' : ''}）`,
    )
    if (sheet.rows.length === 0) {
      parts.push('（空表）')
    } else {
      for (const row of sheet.rows) parts.push(row.join('\t'))
    }
  }
  return parts.join('\n')
}

/** 文件入口：校验 → 读字节 → 解析为预览模型 */
export async function previewWorkbookFile(file: File): Promise<WorkbookPreview> {
  assertWorkbookFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  return parseWorkbookPreview(bytes, file.name)
}
