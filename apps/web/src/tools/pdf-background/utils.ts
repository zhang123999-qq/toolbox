import { PDFArray, PDFDocument, PDFName } from 'pdf-lib'
import type { PDFObject } from 'pdf-lib'

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

/** 背景色预设：选项值 → RGB（0–1），均为浅色，保证正文可读 */
export const BACKGROUND_COLORS: Readonly<Record<string, readonly [number, number, number]>> = {
  gray: [0.92, 0.92, 0.92],
  blue: [0.88, 0.93, 1.0],
  yellow: [1.0, 0.98, 0.88],
  green: [0.9, 0.97, 0.9],
  pink: [1.0, 0.92, 0.94],
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

/** 选项值 → RGB；未知值报错（防御模板外传入的非法选项） */
export function resolveBackgroundColor(color: string): readonly [number, number, number] {
  const rgb = BACKGROUND_COLORS[color]
  if (!rgb) throw new Error(`未知的背景颜色：${color}`)
  return rgb
}

/** 把加载异常翻译成中文：损坏 / 其他 */
export function describePdfLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `PDF 加载失败：文件损坏或不是有效的 PDF 文件（${message}）`
}

/**
 * 给每一页垫背景色：构造一个全页填充矩形的 content stream，
 * 插到该页 Contents 数组的最前面，使其画在原有内容之下。
 */
export async function addBackgroundToPdf(
  pdfBytes: Uint8Array,
  colorName: string,
): Promise<PdfResult> {
  const [r, g, b] = resolveBackgroundColor(colorName)
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(pdfBytes)
  } catch (error) {
    throw new Error(describePdfLoadError(error), { cause: error })
  }
  const Contents = PDFName.of('Contents')
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    // q … Q 包裹，恢复图形状态，不污染原有内容
    const ops = `q\n${r} ${g} ${b} rg\n0 0 ${width} ${height} re\nf\nQ\n`
    const bgRef = doc.context.register(doc.context.stream(ops))
    const existing = page.node.get(Contents)
    const oldItems: PDFObject[] = []
    if (existing instanceof PDFArray) {
      for (let i = 0; i < existing.size(); i += 1) oldItems.push(existing.get(i))
    } else if (existing) {
      oldItems.push(existing)
    }
    const fresh = doc.context.obj([])
    fresh.push(bgRef)
    for (const item of oldItems) fresh.push(item)
    page.node.set(Contents, fresh)
  }
  const bytes = await doc.save()
  return { bytes, pages: doc.getPageCount() }
}
