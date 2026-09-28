import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFString } from 'pdf-lib'

/** pdf-lib 的 StandardFonts 使用 WinAnsi 编码，这里附件名/内容走 PDFString，同样只支持 Latin-1 */
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

/** 附件数据：文件名 + 内容字节 */
export interface AttachmentData {
  readonly filename: string
  readonly content: Uint8Array
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

/** 附件校验：文件名非空、无路径分隔符；内容非空；均为 Latin-1 */
export function parseAttachment(text: string, filenameRaw: string): AttachmentData {
  const filename = filenameRaw.trim()
  if (filename === '') throw new Error('请填写附件文件名')
  if (filename.includes('/') || filename.includes('\\')) {
    throw new Error('附件文件名不能包含路径分隔符')
  }
  if (text === '') throw new Error('请填写附件内容')
  assertLatin1(filename)
  assertLatin1(text)
  return { filename, content: new TextEncoder().encode(text) }
}

/** 把加载异常翻译成中文：损坏 / 其他 */
export function describePdfLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `PDF 加载失败：文件损坏或不是有效的 PDF 文件（${message}）`
}

/**
 * 把文本附件嵌入 PDF：在 Catalog 下建 Names → EmbeddedFiles 名字树，
 * 挂 Filespec（F/UF/EF），附件流带 Size 参数。已有的附件保留（追加）。
 */
export async function attachFileToPdf(
  pdfBytes: Uint8Array,
  text: string,
  filenameRaw: string,
): Promise<PdfResult> {
  const { filename } = parseAttachment(text, filenameRaw)
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(pdfBytes)
  } catch (error) {
    throw new Error(describePdfLoadError(error), { cause: error })
  }

  // 注意：附件内容已由 parseAttachment 保证为 Latin-1，直接传字符串；
  // stream 内部按 charCodeAt 转字节，与 UTF-8 编码结果一致，且避开
  // jsdom 等跨 realm 环境下 Uint8Array 的 instanceof 判定问题。
  const fileStream = doc.context.stream(text, {
    Type: PDFName.of('EmbeddedFile'),
    Params: doc.context.obj({ Size: PDFNumber.of(text.length) }),
  })
  const fileRef = doc.context.register(fileStream)
  const fileSpec = doc.context.obj({
    Type: PDFName.of('Filespec'),
    F: PDFString.of(filename),
    UF: PDFString.of(filename),
    EF: doc.context.obj({ F: fileRef }),
  })
  const fileSpecRef = doc.context.register(fileSpec)

  const namesFound = doc.catalog.lookup(PDFName.of('Names'))
  const namesDict: PDFDict = namesFound instanceof PDFDict ? namesFound : doc.context.obj({})
  if (!(namesFound instanceof PDFDict)) doc.catalog.set(PDFName.of('Names'), namesDict)
  const treeFound = namesDict.lookup(PDFName.of('EmbeddedFiles'))
  const embeddedTree: PDFDict = treeFound instanceof PDFDict ? treeFound : doc.context.obj({})
  if (!(treeFound instanceof PDFDict)) namesDict.set(PDFName.of('EmbeddedFiles'), embeddedTree)
  const arrayFound = embeddedTree.lookup(PDFName.of('Names'))
  const namesArray: PDFArray = arrayFound instanceof PDFArray ? arrayFound : doc.context.obj([])
  if (!(arrayFound instanceof PDFArray)) embeddedTree.set(PDFName.of('Names'), namesArray)
  namesArray.push(PDFString.of(filename))
  namesArray.push(fileSpecRef)

  const bytes = await doc.save()
  return { bytes, pages: doc.getPageCount() }
}
