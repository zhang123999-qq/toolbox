/**
 * pdf-compress 纯函数：文件校验、PDF 压缩（pdf-lib 重封装）、文件名构造。
 * 不触碰 React/DOM，可 100% 单测。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** PDF 魔数头：'%PDF-' */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验文件头是否为 %PDF（魔数检查，不依赖扩展名/MIME） */
export function isPdfFile(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false
  return PDF_MAGIC.every((b, i) => bytes[i] === b)
}

/** 判定是否为 pdf-lib 的加密文档错误 */
export function isEncryptedPdfError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.name === 'EncryptedPDFError' || err.message.includes('is encrypted')
}

export interface CompressPdfOptions {
  /** 是否清除文档元数据（标题/作者/创建者/生产者/主题/关键字） */
  removeMetadata: boolean
}

export interface CompressPdfResult {
  bytes: Uint8Array
  pageCount: number
}

/**
 * 压缩 PDF：pdf-lib 加载 →（可选）清空元数据 → useObjectStreams 重新保存。
 *
 * 诚实说明：pdf-lib 不能对 PDF 内的图片做重编码，因此只能做结构层面的优化
 * （对象流压缩、元数据清理）。多数文件只能减小 0–10%，个别文件可能略有增大。
 * 加密 PDF 会抛 EncryptedPDFError，由调用方转为友好提示。
 * 注意：load 时传 updateMetadata:false，避免 pdf-lib 在加载时把 Producer 盖章为
 * 'pdf-lib (...)'（其 updateInfoDict 在 save 前运行，会覆盖我们清空的 Producer）。
 */
export async function compressPdf(
  data: Uint8Array,
  opts: CompressPdfOptions,
): Promise<CompressPdfResult> {
  const doc = await PDFDocument.load(data, { updateMetadata: false })
  if (opts.removeMetadata) {
    doc.setTitle('')
    doc.setAuthor('')
    doc.setSubject('')
    doc.setKeywords([])
    doc.setCreator('')
    doc.setProducer('')
  }
  const saved = await doc.save({ useObjectStreams: true })
  // save() 返回的视图底层 buffer 类型不确定，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
  return { bytes: new Uint8Array(saved), pageCount: doc.getPageCount() }
}

/** 压缩率文本：new/orig，保留 1 位小数 */
export function compressionRatioText(origBytes: number, newBytes: number): string {
  if (origBytes <= 0) return '—'
  const ratio = (newBytes / origBytes) * 100
  return `${ratio.toFixed(1)}%`
}

/** 构造输出文件名：原名 + -compressed.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-compressed.pdf`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
