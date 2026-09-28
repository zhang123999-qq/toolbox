import { PDFDocument, PDFName, PDFNumber, PDFString } from 'pdf-lib'
import type { PDFDict, PDFRef } from 'pdf-lib'

/** pdf-lib 的 StandardFonts 使用 WinAnsi 编码，书签 Title 写不进中文，直接给出中文错误 */
export const CJK_ERROR = '暂不支持中文字符：pdf-lib 内置字体仅支持 Latin-1 编码，请使用英文内容'

/** PDF 文件的最小信息子集（File 的结构化替身，便于单元测试） */
export interface PdfFileInfo {
  readonly name: string
  readonly size: number
  readonly type: string
}

/** 文件体积上限：100 MiB */
export const MAX_PDF_BYTES = 100 * 1024 * 1024

/** 编辑结果：PDF 二进制 + 页数（供界面展示） */
export interface PdfResult {
  readonly bytes: Uint8Array
  readonly pages: number
}

/** 单条书签：标题 + 目标页码（从 1 开始） */
export interface BookmarkItem {
  readonly title: string
  readonly page: number
}

/** 拒绝非 Latin-1 字符：这类字符写进 PDF 字符串是乱码，不如直接报错 */
export function assertLatin1(text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 0xff) throw new Error(CJK_ERROR)
  }
}

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

/**
 * 解析书签列表：每行"标题,页码"（英文逗号）。
 * 空行跳过；格式/页码非法时报错并带行号。
 */
export function parseBookmarks(text: string): BookmarkItem[] {
  if (text.trim() === '') throw new Error('请填写书签列表（每行"标题,页码"）')
  assertLatin1(text)
  const items: BookmarkItem[] = []
  const raws = text.split('\n')
  for (let i = 0; i < raws.length; i += 1) {
    const raw = raws[i].trim()
    if (raw === '') continue
    const comma = raw.lastIndexOf(',')
    if (comma === -1) {
      throw new Error(`第 ${i + 1} 行格式错误，应为"标题,页码"（用英文逗号分隔）`)
    }
    const title = raw.slice(0, comma).trim()
    const page = Number(raw.slice(comma + 1).trim())
    if (title === '') throw new Error(`第 ${i + 1} 行标题不能为空`)
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`第 ${i + 1} 行页码必须是大于 0 的整数`)
    }
    items.push({ title, page })
  }
  return items
}

/** 书签页码范围校验：超出实际页数时报错并告知总页数 */
export function checkBookmarkPages(items: readonly BookmarkItem[], pageCount: number): void {
  for (const item of items) {
    if (item.page > pageCount) {
      throw new Error(`书签「${item.title}」的页码超出范围：PDF 共 ${pageCount} 页`)
    }
  }
}

/** 把加载异常翻译成中文：损坏 / 其他 */
export function describePdfLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `PDF 加载失败：文件损坏或不是有效的 PDF 文件（${message}）`
}

/**
 * 给 PDF 添加扁平一级书签：在 Catalog 下挂 Outlines 字典，
 * 条目双向链表串起 First/Last，Dest 指向目标页（Fit 模式）。
 * 若原文件已有书签，将被整体替换。
 */
export async function addBookmarksToPdf(pdfBytes: Uint8Array, text: string): Promise<PdfResult> {
  const items = parseBookmarks(text)
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(pdfBytes)
  } catch (error) {
    throw new Error(describePdfLoadError(error), { cause: error })
  }
  const pageCount = doc.getPageCount()
  checkBookmarkPages(items, pageCount)

  const outlines = doc.context.obj({
    Type: PDFName.of('Outlines'),
    Count: PDFNumber.of(items.length),
  })
  const outlinesRef = doc.context.register(outlines)
  let prevDict: PDFDict | null = null
  let prevRef: PDFRef | null = null
  let firstRef: PDFRef | null = null
  for (const item of items) {
    const entry = doc.context.obj({
      Title: PDFString.of(item.title),
      Parent: outlinesRef,
      Dest: doc.context.obj([doc.getPage(item.page - 1).ref, PDFName.of('Fit')]),
    })
    const entryRef = doc.context.register(entry)
    if (prevDict !== null && prevRef !== null) {
      prevDict.set(PDFName.of('Next'), entryRef)
      entry.set(PDFName.of('Prev'), prevRef)
    } else {
      firstRef = entryRef
    }
    prevDict = entry
    prevRef = entryRef
  }
  // parseBookmarks 保证至少一条书签，firstRef/prevRef 此处必非空
  outlines.set(PDFName.of('First'), firstRef as PDFRef)
  outlines.set(PDFName.of('Last'), prevRef as PDFRef)
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef)

  const bytes = await doc.save()
  return { bytes, pages: pageCount }
}
