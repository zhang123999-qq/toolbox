import { PDFDocument, PDFName, PDFNumber, PDFString, StandardFonts, rgb } from 'pdf-lib'

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

/** 链接文字绘制参数（左上角定位） */
export const LINK_X = 72
export const LINK_TOP_MARGIN = 72
export const LINK_FONT_SIZE = 12

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

/** 链接校验：非空、http(s) 开头、Latin-1（PDFString 写不进中文） */
export function validateUrl(raw: string): string {
  const url = raw.trim()
  if (url === '') throw new Error('请填写链接网址')
  if (!/^https?:\/\//i.test(url)) throw new Error('链接必须是 http:// 或 https:// 开头的网址')
  assertLatin1(url)
  return url
}

/** 把加载异常翻译成中文：损坏 / 其他 */
export function describePdfLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `PDF 加载失败：文件损坏或不是有效的 PDF 文件（${message}）`
}

/**
 * 在指定页面（从 1 开始）左上角插入蓝色带下划线的链接文字，
 * 并在其上叠加一个 Link 注释，点击跳转到目标网址。
 */
export async function addLinkToPdf(
  pdfBytes: Uint8Array,
  text: string,
  urlRaw: string,
  pageNumberRaw: string,
): Promise<PdfResult> {
  if (text.trim() === '') throw new Error('请输入链接显示文字')
  assertLatin1(text)
  const url = validateUrl(urlRaw)
  const pageNumber = parsePageNumber(pageNumberRaw)
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(pdfBytes)
  } catch (error) {
    throw new Error(describePdfLoadError(error), { cause: error })
  }
  const pageCount = doc.getPageCount()
  checkPageInRange(pageNumber, pageCount)

  const page = doc.getPage(pageNumber - 1)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const blue = rgb(0, 0, 1)
  const baseline = page.getHeight() - LINK_TOP_MARGIN - LINK_FONT_SIZE
  page.drawText(text, { x: LINK_X, y: baseline, size: LINK_FONT_SIZE, font, color: blue })
  const textWidth = font.widthOfTextAtSize(text, LINK_FONT_SIZE)
  page.drawLine({
    start: { x: LINK_X, y: baseline - 2 },
    end: { x: LINK_X + textWidth, y: baseline - 2 },
    thickness: 1,
    color: blue,
  })

  const annot = doc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: doc.context.obj([
      PDFNumber.of(LINK_X),
      PDFNumber.of(baseline - 4),
      PDFNumber.of(LINK_X + textWidth),
      PDFNumber.of(baseline + LINK_FONT_SIZE),
    ]),
    Border: doc.context.obj([PDFNumber.of(0), PDFNumber.of(0), PDFNumber.of(0)]),
    A: doc.context.obj({
      Type: PDFName.of('Action'),
      S: PDFName.of('URI'),
      URI: PDFString.of(url),
    }),
  })
  page.node.addAnnot(doc.context.register(annot))

  const bytes = await doc.save()
  return { bytes, pages: pageCount }
}
