/**
 * pdf-rotate 纯函数：文件校验、页范围解析、角度归一化、页面旋转、文件名构造。
 * 不触碰 React/DOM，可 100% 单测。
 */
import { PDFDocument, degrees } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** PDF 魔数头：'%PDF-' */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const

/** 角度归一化后的合法取值 */
export type NormalizedAngle = 0 | 90 | 180 | 270

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

/** 校验单页页码在 [1, totalPages] 内 */
function checkPageInRange(n: number, token: string, totalPages: number): void {
  if (n < 1 || n > totalPages) {
    throw new Error(`页码超出范围：${token}（该 PDF 共 ${totalPages} 页）`)
  }
}

/**
 * 解析页范围："1-3,5" → 去重、升序的 1-based 页码数组。
 * 非法抛错：空输入、空片段、非数字、范围倒置（如 5-3）、页码超范围。
 */
export function parsePageRanges(raw: string, totalPages: number): number[] {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error('PDF 页数无效')
  }
  const text = raw.trim()
  if (text === '') throw new Error('页码范围不能为空（如 1-3,5）')
  const selected = new Set<number>()
  for (const fragment of text.split(',')) {
    const token = fragment.trim()
    if (token === '') throw new Error(`页码范围非法：存在空片段（${raw}）`)
    const dashIndex = token.indexOf('-')
    if (dashIndex >= 0) {
      const startRaw = token.slice(0, dashIndex).trim()
      const endRaw = token.slice(dashIndex + 1).trim()
      if (!/^\d+$/.test(startRaw) || !/^\d+$/.test(endRaw)) {
        throw new Error(`页码范围无效：${token}（须为正整数或范围如 1-3）`)
      }
      const start = Number(startRaw)
      const end = Number(endRaw)
      if (start > end) throw new Error(`页码范围倒置：${token}（起始页不能大于结束页）`)
      checkPageInRange(start, token, totalPages)
      checkPageInRange(end, token, totalPages)
      for (let n = start; n <= end; n++) selected.add(n)
    } else {
      if (!/^\d+$/.test(token)) throw new Error(`页码无效：${token}（须为正整数或范围如 1-3）`)
      const n = Number(token)
      checkPageInRange(n, token, totalPages)
      selected.add(n)
    }
  }
  return [...selected].sort((a, b) => a - b)
}

/**
 * 角度归一化：取模 360 后必须是 90 的倍数，归一化到 0/90/180/270；
 * 非 90 倍数（如 45）或非有限数抛错。
 */
export function normalizeAngle(deg: number): NormalizedAngle {
  if (!Number.isFinite(deg)) throw new Error(`角度无效：${deg}（须为 90/180/270）`)
  const n = ((deg % 360) + 360) % 360
  if (n % 90 !== 0) throw new Error(`角度无效：${deg}（须为 90/180/270）`)
  return n as NormalizedAngle
}

/**
 * 旋转指定页面（1-based 页码，其余页面不动）：
 * 新角度 = (原角度 + 增量) % 360，角度累加取模。
 * 加密 PDF 会抛 EncryptedPDFError，由调用方转为友好提示。
 */
export async function rotatePdf(
  data: Uint8Array,
  pageNums: number[],
  delta: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  const count = doc.getPageCount()
  const unique = [...new Set(pageNums)]
  for (const n of unique) {
    if (!Number.isInteger(n) || n < 1 || n > count) {
      throw new Error(`页码超出范围：${n}（该 PDF 共 ${count} 页）`)
    }
  }
  const step = normalizeAngle(delta)
  for (const n of unique) {
    const page = doc.getPage(n - 1)
    const current = page.getRotation().angle
    page.setRotation(degrees((current + step) % 360))
  }
  const saved = await doc.save()
  // save() 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图
  return new Uint8Array(saved)
}

/** 构造输出文件名：原名 + -rotated.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-rotated.pdf`
}
