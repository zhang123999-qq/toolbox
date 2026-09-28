/**
 * pdf-split 纯函数：文件校验、页范围解析、拆分分组、文件名构造、pdf-lib 拆分。
 * 不触碰 React/DOM，可 100% 单测；pdf-lib 只在异步函数内部使用。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** PDF 魔数 "%PDF-" 的前 5 个字节 */
const PDF_MAGIC: readonly number[] = [0x25, 0x50, 0x44, 0x46, 0x2d]

/** 拆分模式：ranges=按页范围，chunks=每 N 页，single=单页逐个 */
export type SplitMode = 'ranges' | 'chunks' | 'single'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 按 %PDF 魔数判定是否为 PDF（不依赖扩展名/MIME） */
export function isPdfFile(data: Uint8Array): boolean {
  if (data.length < PDF_MAGIC.length) return false
  return PDF_MAGIC.every((byte, i) => data[i] === byte)
}

/** 解析单个页码 token：正整数且在 1..totalPages 内 */
function parsePageToken(token: string, raw: string, totalPages: number): number {
  if (!/^\d+$/.test(token)) {
    throw new Error(`页码无效：${token}（须为正整数，输入：${raw}）`)
  }
  const n = Number(token)
  if (n < 1 || n > totalPages) {
    throw new Error(`页码超出范围：${token}（PDF 共 ${totalPages} 页，输入：${raw}）`)
  }
  return n
}

/** 解析单个逗号片段（单个页码或 a-b 范围），返回片段内的页码数组 */
function parseFragment(token: string, raw: string, totalPages: number): number[] {
  if (token.includes('-')) {
    const segs = token.split('-').map((s) => s.trim())
    if (segs.length !== 2) throw new Error(`页码范围非法：${token}（形如 5-7）`)
    const [startRaw, endRaw] = segs
    const start = parsePageToken(startRaw, raw, totalPages)
    const end = parsePageToken(endRaw, raw, totalPages)
    if (start > end) throw new Error(`页码范围倒置：${token}（起始页不能大于结束页）`)
    const pages: number[] = []
    for (let n = start; n <= end; n++) pages.push(n)
    return pages
  }
  return [parsePageToken(token, raw, totalPages)]
}

/**
 * ranges 模式分组：每个逗号片段独立成一个输出文件，片段内排序去重。
 * 校验失败时抛错（空输入 / 空片段 / 非法 token / 逆序范围 / 超范围页码）。
 */
export function parseRangesToGroups(raw: string, totalPages: number): number[][] {
  const text = raw.trim()
  if (text === '') throw new Error('页码范围不能为空（如 1-3,5,8-10）')
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error('PDF 页数无效')
  return text.split(',').map((fragment) => {
    const token = fragment.trim()
    if (token === '') throw new Error(`页码范围非法：存在空片段（${raw}）`)
    return [...new Set(parseFragment(token, raw, totalPages))].sort((a, b) => a - b)
  })
}

/**
 * 页范围解析（核心纯函数）：返回全部页码，去重并升序排列。
 * 如 "1-3,5,8-10"（总 12 页）→ [1,2,3,5,8,9,10]。
 */
export function parsePageRanges(raw: string, totalPages: number): number[] {
  return [...new Set(parseRangesToGroups(raw, totalPages).flat())].sort((a, b) => a - b)
}

/** 解析每份页数：≥1 的整数 */
export function parseChunkSize(raw: string): number {
  const text = raw.trim()
  if (text === '') throw new Error('每份页数不能为空')
  if (!/^\d+$/.test(text)) throw new Error(`每份页数无效：${raw}（须为 ≥1 的整数）`)
  const n = Number(text)
  if (n < 1) throw new Error(`每份页数无效：${raw}（须为 ≥1 的整数）`)
  return n
}

/**
 * 按拆分模式构造输出分组（每组为 1-based 页码数组，每组对应一个输出文件）。
 * ranges：每个逗号片段一组；chunks：每 N 页一组；single：每页一组。
 */
export function buildSplitGroups(
  mode: SplitMode,
  pagesRaw: string,
  chunkRaw: string,
  totalPages: number,
): number[][] {
  if (mode === 'single') {
    return Array.from({ length: totalPages }, (_, i) => [i + 1])
  }
  if (mode === 'chunks') {
    const n = parseChunkSize(chunkRaw)
    const groups: number[][] = []
    for (let start = 1; start <= totalPages; start += n) {
      const group: number[] = []
      for (let p = start; p < Math.min(start + n, totalPages + 1); p++) group.push(p)
      groups.push(group)
    }
    return groups
  }
  return parseRangesToGroups(pagesRaw, totalPages)
}

/** 构造输出文件名：原名 + -p{起}-{止}.pdf（单页时为 -p{页}.pdf） */
export function buildOutputFileName(
  originalName: string,
  startPage: number,
  endPage: number,
): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'pdf'
  const suffix = startPage === endPage ? `p${startPage}` : `p${startPage}-${endPage}`
  return `${base}-${suffix}.pdf`
}

/** 载入 PDF 文档；加密 PDF 抛明确错误（pdf-lib 不支持解密） */
export async function loadPdfDocument(data: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(data)
  } catch (err) {
    if (/encrypt/i.test(errorMessage(err))) {
      throw new Error('该 PDF 已加密（受密码保护），本工具无法处理', { cause: err })
    }
    throw err
  }
}

/** 读取 PDF 总页数 */
export async function getPdfPageCount(data: Uint8Array): Promise<number> {
  const doc = await loadPdfDocument(data)
  return doc.getPageCount()
}

/**
 * 拆分 PDF：每组页码（1-based）copyPages 到新文档并保存，返回每组对应的 PDF 字节。
 * 页码越界时 pdf-lib 会抛错（分组由 buildSplitGroups 构造，调用方保证合法）。
 */
export async function splitPdf(data: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const src = await loadPdfDocument(data)
  const outputs: Uint8Array[] = []
  for (const group of groups) {
    const indices = group.map((p) => p - 1)
    const doc = await PDFDocument.create()
    const pages = await doc.copyPages(src, indices)
    for (const page of pages) doc.addPage(page)
    const saved = await doc.save()
    // save() 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图
    outputs.push(new Uint8Array(saved))
  }
  return outputs
}
