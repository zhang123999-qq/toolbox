/**
 * 分隔文本表格与 .xlsx 的共用解析（与 UI、目标格式无关的纯函数）。
 *
 * Excel 转 CSV（#? excel-to-csv）与 Excel 转 JSON（#164）都要：猜分隔符、按
 * CSV/TSV 规则解析二维表、对 .xlsx 做最小 zip/XML 读取。按 DEVELOPMENT.md §8.4
 * 「工具之间禁止互相 import，共用逻辑一律上提到 lib」统一放这里。
 *
 * .xlsx 只做最小解析：读第一张工作表，依赖浏览器 DecompressionStream 解 deflate-raw。
 */
import Papa from 'papaparse'

/** 表格解析的统一错误类型；各工具可把它别名成本工具的 XxxError */
export class SpreadsheetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpreadsheetError'
  }
}

/** 文本输入上限 */
export const MAX_SPREADSHEET_INPUT = 5_000_000

/** 二进制入口的体积上限：20 MiB */
export const MAX_SPREADSHEET_FILE_BYTES = 20 * 1024 * 1024

/** 分隔符名；`auto` 表示按内容猜 */
export type DelimiterName = 'auto' | 'comma' | 'tab' | 'semicolon' | 'pipe'

const DELIMITER_CHAR: Record<Exclude<DelimiterName, 'auto'>, string> = {
  comma: ',',
  tab: '\t',
  semicolon: ';',
  pipe: '|',
}

const CANDIDATES: readonly Exclude<DelimiterName, 'auto'>[] = ['comma', 'tab', 'semicolon', 'pipe']

/** 选项里的分隔符名 → 实际字符；`auto` 走按内容猜测 */
export function resolveDelimiter(name: DelimiterName, text: string): string {
  if (name !== 'auto') return DELIMITER_CHAR[name] ?? ','
  return DELIMITER_CHAR[detectDelimiter(text)] ?? ','
}

/** 猜分隔符：取首个非空行里出现次数最多的候选，一个都没有时退回逗号 */
export function detectDelimiter(text: string): Exclude<DelimiterName, 'auto'> {
  const line = text.split(/\r?\n/).find((item) => item.trim() !== '') ?? ''
  let best: Exclude<DelimiterName, 'auto'> = 'comma'
  let bestCount = 0
  for (const name of CANDIDATES) {
    const count = line.split(DELIMITER_CHAR[name]).length - 1
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }
  return best
}

/** 文本表格 → 二维表；引号不配对时给出错误 */
export function parseTableText(text: string, delimiter: string): string[][] {
  const parsed = Papa.parse<string[]>(text.replace(/\r\n?/g, '\n'), {
    delimiter,
    newline: '\n',
    skipEmptyLines: 'greedy',
  })
  const quoted = parsed.errors.find((error) => error.type === 'Quotes')
  if (quoted) {
    throw new SpreadsheetError(
      `第 ${(quoted.row ?? 0) + 1} 行的引号没有配对，无法解析（${quoted.message}）`,
    )
  }
  return parsed.data
}

// ————————————————————————————————————————————————————————————
// .xlsx 最小解析：zip 目录 → inflate → 两个 XML → 二维表
// ————————————————————————————————————————————————————————————

interface InflateStream {
  readonly writable: WritableStream<Uint8Array>
  readonly readable: ReadableStream<Uint8Array>
}

/** deflate-raw 解压；浏览器 / Node 18+ 才有 */
export async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Ctor = (globalThis as { DecompressionStream?: new (format: string) => InflateStream })
    .DecompressionStream
  if (!Ctor) {
    throw new SpreadsheetError(
      '当前环境不支持 DecompressionStream，无法解析 .xlsx；请改用 .csv / .tsv / .txt 文本表格',
    )
  }
  const stream = new Ctor('deflate-raw')
  const writer = stream.writable.getWriter()
  const pending = (async () => {
    await writer.write(data)
    await writer.close()
  })()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(new Uint8Array(value))
  }
  await pending
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/** 从尾部倒着找 EOCD（签名 0x06054b50） */
function findEocd(view: DataView, length: number): number {
  const min = Math.max(0, length - 65558)
  for (let i = length - 22; i >= min; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) return i
  }
  return -1
}

/** 读 zip 中央目录，取出全部条目（名字 → 字节）。不校验 CRC、不支持分卷与 zip64 */
export async function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = findEocd(view, bytes.length)
  if (eocd < 0) throw new SpreadsheetError('不是有效的 .xlsx / zip 文件（找不到目录结束标记）')

  const count = view.getUint16(eocd + 10, true)
  let pointer = view.getUint32(eocd + 16, true)
  const files = new Map<string, Uint8Array>()

  for (let i = 0; i < count; i += 1) {
    if (pointer + 46 > bytes.length || view.getUint32(pointer, true) !== 0x02014b50) {
      throw new SpreadsheetError('不是有效的 .xlsx / zip 文件（中央目录损坏）')
    }
    const method = view.getUint16(pointer + 10, true)
    const compressedSize = view.getUint32(pointer + 20, true)
    const nameLength = view.getUint16(pointer + 28, true)
    const extraLength = view.getUint16(pointer + 30, true)
    const commentLength = view.getUint16(pointer + 32, true)
    const localOffset = view.getUint32(pointer + 42, true)
    const name = new TextDecoder('utf-8').decode(
      bytes.subarray(pointer + 46, pointer + 46 + nameLength),
    )

    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new SpreadsheetError('不是有效的 .xlsx / zip 文件（本地头损坏）')
    }
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const raw = bytes.subarray(start, start + compressedSize)

    if (method === 0) files.set(name, raw)
    else if (method === 8) files.set(name, await inflateRaw(raw))
    else throw new SpreadsheetError(`不支持的压缩方式（method=${method}），无法解析该 .xlsx`)

    pointer += 46 + nameLength + extraLength + commentLength
  }
  return files
}

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
}

/** 解 XML 实体：预定义 5 个 + 十进制 / 十六进制字符引用 */
export function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    }
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
    return NAMED_ENTITIES[body] ?? whole
  })
}

export interface XmlSlice {
  readonly attrs: string
  readonly inner: string
}

/** 切出某个标签的所有出现位置 */
export function sliceElements(xml: string, tag: string): readonly XmlSlice[] {
  const out: XmlSlice[] = []
  const open = `<${tag}`
  let from = 0
  for (;;) {
    const start = xml.indexOf(open, from)
    if (start < 0) break
    const next = xml[start + open.length]
    if (
      next !== ' ' &&
      next !== '>' &&
      next !== '/' &&
      next !== '\n' &&
      next !== '\r' &&
      next !== '\t'
    ) {
      from = start + open.length
      continue
    }
    const gt = xml.indexOf('>', start)
    if (gt < 0) break
    const attrs = xml.slice(start + open.length, gt)
    if (attrs.trimEnd().endsWith('/')) {
      out.push({ attrs, inner: '' })
      from = gt + 1
      continue
    }
    const end = xml.indexOf(`</${tag}>`, gt)
    if (end < 0) break
    out.push({ attrs, inner: xml.slice(gt + 1, end) })
    from = end + tag.length + 3
  }
  return out
}

/** `A` → 0，`AA` → 26 */
export function columnIndex(letters: string): number {
  let index = 0
  for (const char of letters) {
    index = index * 26 + (char.charCodeAt(0) - 64)
  }
  return index === 0 ? 0 : index - 1
}

/** sharedStrings.xml → 字符串数组 */
export function sharedStringsFrom(xml: string): readonly string[] {
  return sliceElements(xml, 'si').map((si) =>
    sliceElements(si.inner, 't')
      .map((item) => decodeXml(item.inner))
      .join(''),
  )
}

/** 单元格取值：共享字符串 / 内联字符串 / 布尔 / 数字 */
function cellValue(inner: string, type: string, shared: readonly string[]): string {
  if (type === 'inlineStr') {
    return sliceElements(inner, 't')
      .map((item) => decodeXml(item.inner))
      .join('')
  }
  const raw = sliceElements(inner, 'v').map((item) => decodeXml(item.inner))[0] ?? ''
  if (type === 's') return shared[Number(raw)] ?? ''
  if (type === 'b') return raw === '1' ? 'TRUE' : 'FALSE'
  return raw
}

/** sheet1.xml + 共享字符串 → 二维表 */
export function sheetToRows(xml: string, shared: readonly string[]): string[][] {
  const rows: string[][] = []
  for (const row of sliceElements(xml, 'row')) {
    const cells: string[] = []
    for (const cell of sliceElements(row.inner, 'c')) {
      const letters = /\br="([A-Za-z]+)/.exec(cell.attrs)?.[1] ?? ''
      const type = /\bt="([A-Za-z]+)"/.exec(cell.attrs)?.[1] ?? 'n'
      const value = cellValue(cell.inner, type, shared)
      const col = letters === '' ? cells.length : columnIndex(letters.toUpperCase())
      while (cells.length < col) cells.push('')
      cells[col] = value
    }
    rows.push(cells)
  }
  return rows
}

/** 挑工作表：优先 sheet1.xml，否则按名字排序取第一张 */
export function pickSheet(names: readonly string[]): string {
  const exact = names.find((name) => name === 'xl/worksheets/sheet1.xml')
  if (exact) return exact
  const any = names
    .filter((name) => /^xl\/worksheets\/[^/]+\.xml$/.test(name))
    .sort()
    .at(0)
  if (any) return any
  throw new SpreadsheetError('这个 .xlsx 里没有找到工作表（xl/worksheets/sheet1.xml）')
}

/** .xlsx 字节 → 二维表（只取第一张工作表） */
export async function xlsxToRows(bytes: Uint8Array): Promise<string[][]> {
  if (bytes.length > MAX_SPREADSHEET_FILE_BYTES) {
    throw new SpreadsheetError('文件超过 20 MiB 上限，请用命令行工具处理')
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new SpreadsheetError('这不是 .xlsx 文件（zip 头不是 PK）')
  }
  const files = await readZip(bytes)
  const sheet = files.get(pickSheet([...files.keys()]))
  if (!sheet) throw new SpreadsheetError('这个 .xlsx 里没有找到工作表（xl/worksheets/sheet1.xml）')
  const decoder = new TextDecoder('utf-8')
  const sharedXml = files.get('xl/sharedStrings.xml')
  const shared = sharedXml ? sharedStringsFrom(decoder.decode(sharedXml)) : []
  return sheetToRows(decoder.decode(sheet), shared)
}

/** 文件入口：.xlsx 走二进制解析，其余按文本表格处理 */
export async function rowsFromFileBytes(
  bytes: Uint8Array,
  fileName: string,
  options: { readonly delimiter: DelimiterName },
): Promise<string[][]> {
  if (fileName.toLowerCase().endsWith('.xlsx')) return xlsxToRows(bytes)
  const text = new TextDecoder('utf-8').decode(bytes)
  if (text.trim() === '') throw new SpreadsheetError('文件内容为空')
  return parseTableText(text, resolveDelimiter(options.delimiter, text))
}
