/**
 * pdf-merge 纯函数：文件校验（魔数/大小）、列表排序、文件名构造、PDF 合并。
 * 不触碰 DOM；pdf-lib 为纯 JS（无 DOM 依赖），可 100% 单测。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（每文件单独校验；浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为可合并的 PDF。
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

/** 校验上传文件大小（每文件单独校验） */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
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

/** 删除列表项：索引越界时返回原数组的拷贝，不抛错、不改原数组 */
export function removeItem<T>(list: T[], index: number): T[] {
  const next = [...list]
  if (!Number.isInteger(index) || index < 0 || index >= next.length) return next
  next.splice(index, 1)
  return next
}

/** 构造输出文件名：首文件名 + -merged.pdf */
export function buildOutputFileName(firstFileName: string): string {
  const base = firstFileName.replace(/\.[a-z0-9]+$/i, '') || 'merged'
  return `${base}-merged.pdf`
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

/**
 * 读取 PDF 页数；加密/损坏等解析失败时返回 null（不抛错）。
 * 上传阶段仅用于列表展示，真正的校验错误在合并阶段逐文件报出。
 */
export async function tryGetPageCount(bytes: Uint8Array): Promise<number | null> {
  try {
    const doc = await PDFDocument.load(bytes)
    return doc.getPageCount()
  } catch {
    return null
  }
}

/**
 * 按给定顺序合并多个 PDF：新建文档 → 逐个载入源文档 →
 * copyPages 拷贝全部页面 → addPage 追加 → save。
 * 加密 PDF 会在 PDFDocument.load 抛出 EncryptedPDFError，向上传播由调用方转译。
 */
export async function mergePdfs(buffers: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (const bytes of buffers) {
    const src = await PDFDocument.load(bytes)
    const pages = await merged.copyPages(src, src.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  const saved: Uint8Array = await merged.save({ useObjectStreams: true })
  // 拷贝为确定性的 ArrayBuffer 视图，调用方可直接作 BlobPart
  return new Uint8Array(saved)
}
