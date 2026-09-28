/**
 * pdf-delete 纯函数：文件校验、页码范围解析、选择集合 helpers、
 * 删除页面核心逻辑（pdf-lib）、文件名构造。
 * 不触碰 React/DOM，可 100% 单测。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** PDF 魔数头 "%PDF-" */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const
/** 超过该页数时提示性能风险（缩略图逐页渲染较慢） */
export const MANY_PAGES_WARN = 100

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

/** 是否为 PDF 文件：检查 %PDF- 魔数 */
export function isPdfFile(data: Uint8Array): boolean {
  if (data.length < PDF_MAGIC.length) return false
  return PDF_MAGIC.every((b, i) => data[i] === b)
}

/** 页码是否合法（1-based 且 ≤ 总页数） */
export function isValidPageNum(n: number, pageCount: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= pageCount
}

/** 校验单页页码在 [1, pageCount] 内 */
function checkPageInRange(n: number, token: string, pageCount: number): void {
  if (n < 1 || n > pageCount) {
    throw new Error(`页码超出范围：${token}（该 PDF 共 ${pageCount} 页）`)
  }
}

/**
 * 解析页码选择（供"按范围快速勾选"输入用）：
 * - "all"（不区分大小写）→ 全部页面
 * - "1,3,5-7" → 去重、升序的页码数组
 * 非法抛错：空选择、非数字、页码超范围、范围倒置（如 7-5）
 */
export function parsePageSelection(raw: string, pageCount: number): number[] {
  const t = raw.trim()
  if (t.toLowerCase() === 'all') {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }
  if (t === '') throw new Error('页码选择不能为空（如 "1,3,5-7"，"all" 表示全部页面）')
  const selected = new Set<number>()
  for (const fragment of t.split(',')) {
    const token = fragment.trim()
    if (token === '') throw new Error(`页码选择非法：存在空片段（${raw}）`)
    if (token.includes('-')) {
      const segs = token.split('-').map((s) => s.trim())
      if (segs.length !== 2) throw new Error(`页码范围非法：${token}（形如 5-7）`)
      const [startRaw, endRaw] = segs
      if (!/^\d+$/.test(startRaw) || !/^\d+$/.test(endRaw)) {
        throw new Error(`页码无效：${token}（须为正整数或范围如 5-7）`)
      }
      const start = Number(startRaw)
      const end = Number(endRaw)
      if (start > end) throw new Error(`页码范围倒置：${token}（起始页不能大于结束页）`)
      checkPageInRange(start, token, pageCount)
      checkPageInRange(end, token, pageCount)
      for (let n = start; n <= end; n++) selected.add(n)
    } else {
      if (!/^\d+$/.test(token)) throw new Error(`页码无效：${token}（须为正整数或范围如 5-7）`)
      const n = Number(token)
      checkPageInRange(n, token, pageCount)
      selected.add(n)
    }
  }
  return [...selected].sort((a, b) => a - b)
}

/** 切换选中集合中的页码（存在则移除，不存在则加入），返回升序新数组 */
export function toggleInSet(selected: number[], page: number): number[] {
  const set = new Set(selected)
  if (set.has(page)) set.delete(page)
  else set.add(page)
  return [...set].sort((a, b) => a - b)
}

/** 全选：返回 1..pageCount */
export function selectAll(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, i) => i + 1)
}

/** 反选：返回未被选中的页码（升序） */
export function invertSelection(selected: number[], pageCount: number): number[] {
  const set = new Set(selected)
  const out: number[] = []
  for (let n = 1; n <= pageCount; n++) {
    if (!set.has(n)) out.push(n)
  }
  return out
}

/**
 * 删除按钮禁用原因：未选任何页 → 'none'；选中全部页 → 'all'
 * （至少保留 1 页）；可删除 → null
 */
export function deleteBlockReason(selectedCount: number, pageCount: number): 'none' | 'all' | null {
  if (selectedCount <= 0) return 'none'
  if (selectedCount >= pageCount) return 'all'
  return null
}

/**
 * 删除页面：保留 keepNums 指定的页（1-based），用 copyPages 复制到新文档。
 * keepNums 为空时抛错（至少保留 1 页）；页码越界抛错。
 */
export async function deletePages(data: Uint8Array, keepNums: number[]): Promise<Uint8Array> {
  if (keepNums.length === 0) throw new Error('不能删除全部页面：至少保留 1 页')
  const src = await PDFDocument.load(data)
  const pageCount = src.getPageCount()
  const keep = [...new Set(keepNums)].sort((a, b) => a - b)
  for (const n of keep) {
    if (!isValidPageNum(n, pageCount)) {
      throw new Error(`页码超出范围：${n}（该 PDF 共 ${pageCount} 页）`)
    }
  }
  const out = await PDFDocument.create()
  const pages = await out.copyPages(
    src,
    keep.map((n) => n - 1),
  )
  for (const p of pages) out.addPage(p)
  const bytes = await out.save()
  // pdf-lib save() 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后返回
  return new Uint8Array(bytes)
}

/** 构造输出文件名：原名 + -deleted.pdf（空名兜底为 pdf） */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'pdf'
  return `${base}-deleted.pdf`
}
