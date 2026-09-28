/**
 * pdf-sort 纯函数：文件校验（魔数/大小/页数）、页面顺序调整、PDF 重排。
 * 不触碰 DOM；pdf-lib 为纯 JS（无 DOM 依赖），可 100% 单测。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 页数上限 500（防 OOM；README 说明） */
export const MAX_PAGE_COUNT = 500

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为可排序的 PDF。
 */
export function isPdfFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验 PDF 页数（防 OOM） */
export function assertPageCountOk(count: number): void {
  if (count > MAX_PAGE_COUNT) {
    throw new Error(`页数过多：上限 ${MAX_PAGE_COUNT} 页`)
  }
}

/**
 * 是否为 pdf-lib 抛出的加密 PDF 错误。
 * 注意：pdf-lib 1.17 的 EncryptedPDFError 构造器有 bug
 * （`_super.call(this, msg) || this` 返回了一个全新的普通 Error，
 * 原型链断裂），`instanceof EncryptedPDFError` 恒为 false，
 * 只能按 message 文案（"…is encrypted…"）识别。
 */
export function isEncryptedPdfError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('is encrypted')
}

/** 初始顺序：0..n-1（原页面索引的自然排列） */
export function initialOrder(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, i) => i)
}

/**
 * 移动列表项：index 处元素沿 dir（-1 上移 / 1 下移）移动一位。
 * 索引越界或目标越界时返回原数组的拷贝，不抛错、不改原数组。
 */
export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list]
  if (!Number.isInteger(index) || index < 0 || index >= next.length) return next
  const target = index + dir
  if (target < 0 || target >= next.length) return next
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

/** 反转顺序：返回反转后的拷贝，不改原数组 */
export function reverseOrder<T>(list: T[]): T[] {
  return [...list].reverse()
}

/** 构造输出文件名：原名 + -sorted.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'sorted'
  return `${base}-sorted.pdf`
}

/** 页面尺寸文本：宽高四舍五入取整，pt 单位 */
export function formatPageSize(width: number, height: number): string {
  return `${Math.round(width)}×${Math.round(height)} pt`
}

/** PDF 页面信息：页数与每页尺寸（宽高，pt） */
export interface PdfPageInfo {
  pageCount: number
  pageSizes: { width: number; height: number }[]
}

/**
 * 读取 PDF 页数与每页尺寸；加密/损坏等解析失败时抛错，由调用方转译。
 * 注意：load 时传 updateMetadata:false，避免 pdf-lib 把 Producer 盖章为
 * pdf-lib（见 pdf-compress 注释）。
 */
export async function readPdfInfo(bytes: Uint8Array): Promise<PdfPageInfo> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const pageSizes = doc.getPages().map((page) => {
    const { width, height } = page.getSize()
    return { width, height }
  })
  return { pageCount: doc.getPageCount(), pageSizes }
}

/**
 * 按 order（原页面索引的新排列）重排页面并生成新 PDF：
 * 新建文档 → copyPages 按新顺序拷贝 → addPage 追加 → save。
 * order 须为 0..n-1 的全排列，否则抛错；加密 PDF 在 load 阶段抛
 * EncryptedPDFError，向上传播由调用方转译。
 */
export async function sortPdfPages(bytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { updateMetadata: false })
  const pageCount = src.getPageCount()
  if (order.length !== pageCount) {
    throw new Error(`页面顺序长度不符：期望 ${pageCount}，实际 ${order.length}`)
  }
  const seen = new Set<number>()
  for (const idx of order) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= pageCount || seen.has(idx)) {
      throw new Error(`页面顺序无效：索引 ${idx} 非法`)
    }
    seen.add(idx)
  }
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, order)
  for (const page of pages) out.addPage(page)
  const saved: Uint8Array = await out.save({ useObjectStreams: true })
  // 拷贝为确定性的 ArrayBuffer 视图，调用方可直接作 BlobPart
  return new Uint8Array(saved)
}
