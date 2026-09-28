import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/** pdf-lib 的 StandardFonts 使用 WinAnsi 编码，画不出中文字符，直接给出中文错误 */
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

/** 拒绝非 Latin-1 字符：这类字符用内置字体画出来是乱码，不如直接报错 */
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

/** 页码解析：必须是正整数；空 / 小数 / 非数字都报错 */
export function parsePageNumber(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === '') throw new Error('请填写页码（从 1 开始）')
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1) throw new Error('页码必须是大于 0 的整数')
  return n
}

/** 页码范围校验：超出实际页数时报错并告知总页数 */
export function checkPageInRange(pageNumber: number, pageCount: number): void {
  if (pageNumber > pageCount) {
    throw new Error(`页码超出范围：PDF 共 ${pageCount} 页`)
  }
}

/** 把加载异常翻译成中文：损坏 / 其他 */
export function describePdfLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `PDF 加载失败：文件损坏或不是有效的 PDF 文件（${message}）`
}

/**
 * 在指定页面（从 1 开始）的左上角插入一行文字。
 * 流程：校验 → 解析页码 → 加载 → 范围校验 → 绘制 → 保存。
 */
export async function insertTextIntoPdf(
  pdfBytes: Uint8Array,
  text: string,
  pageNumberRaw: string,
): Promise<PdfResult> {
  if (text.trim() === '') throw new Error('请输入要插入的文字')
  assertLatin1(text)
  const pageNumber = parsePageNumber(pageNumberRaw)
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(pdfBytes)
  } catch (error) {
    throw new Error(describePdfLoadError(error), { cause: error })
  }
  const pageCount = doc.getPageCount()
  checkPageInRange(pageNumber, pageCount)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.getPage(pageNumber - 1)
  page.drawText(text, {
    x: 72,
    y: page.getHeight() - 72,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  })
  const bytes = await doc.save()
  return { bytes, pages: pageCount }
}
