import Papa from 'papaparse'
import type { CsvToExcelInput, CsvToExcelOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class CsvToExcelError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvToExcelError'
  }
}

/** 与 schema 的 max 保持一致 */
const MAX_INPUT = 5_000_000

const DELIMITER_CHAR: Record<string, string> = {
  comma: ',',
  tab: '\t',
  semicolon: ';',
  pipe: '|',
}

const NUMBER_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/

/** XML 文本转义；SpreadsheetML 里的属性值与文本内容都要转义 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 单元格类型：纯数字写 Number，其余一律 String，避免 Excel 把 007 这类串吞掉 */
function cellType(value: string): string {
  return NUMBER_RE.test(value.trim()) ? 'Number' : 'String'
}

/** 单个 <Cell>：空单元格只留 <Cell/>，Excel 会当成空格 */
export function renderCell(value: string, styleId: string): string {
  if (value === '') return `<Cell${styleId}/>`
  return `<Cell${styleId}><Data ss:Type="${cellType(value)}">${escapeXml(value)}</Data></Cell>`
}

export function renderRow(values: readonly string[], styleId: string): string {
  return `<Row>${values.map((value) => renderCell(value, styleId)).join('')}</Row>`
}

/**
 * 生成 SpreadsheetML 2003（Excel XML Spreadsheet）。
 * 选择它而不是 .xlsx 的原因：.xlsx 是 zip + OOXML，不装 xlsx 库就无法生成，
 * 而 SpreadsheetML 是纯文本 XML，Excel 2003 起就能直接打开。
 */
export function renderWorkbook(rows: readonly string[][], header: boolean): string {
  const styleOf = (index: number): string => (header && index === 0 ? ' ss:StyleID="sHeader"' : '')
  const body = rows.map((row, index) => renderRow(row, styleOf(index))).join('\n')
  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Styles>',
    '<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/></Style>',
    '<Style ss:ID="sHeader"><Font ss:Bold="1"/><Interior ss:Color="#EEEEEE" ss:Pattern="Solid"/></Style>',
    '</Styles>',
    '<Worksheet ss:Name="Sheet1">',
    '<Table>',
    body,
    '</Table>',
    '</Worksheet>',
    '</Workbook>',
  ].join('\n')
}

/** 解析成二维表；引号不配对时给出行号 */
export function parseRows(text: string, delimiter: string): string[][] {
  const parsed = Papa.parse<string[]>(text.replace(/\r\n?/g, '\n'), {
    delimiter,
    newline: '\n',
    skipEmptyLines: 'greedy',
  })
  const quoted = parsed.errors.find((error) => error.type === 'Quotes')
  if (quoted) {
    throw new CsvToExcelError(
      `第 ${(quoted.row ?? 0) + 1} 行的引号没有配对，无法解析（${quoted.message}）`,
    )
  }
  return parsed.data
}

/**
 * CSV 转表格 —— 纯函数，不依赖 React / DOM，可独立单测。
 * format=xml 出 SpreadsheetML；csv / tsv 只是换分隔符重新序列化（顺带统一引号与换行）。
 */
export function transform(input: CsvToExcelInput, options: CsvToExcelOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new CsvToExcelError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }

  const rows = parseRows(input.text, DELIMITER_CHAR[options.delimiter] ?? ',')
  if (rows.length === 0) return ''

  if (options.format === 'xml') return renderWorkbook(rows, options.header)
  const delimiter = options.format === 'tsv' ? '\t' : ','
  return Papa.unparse(rows, { delimiter, newline: '\n' })
}
