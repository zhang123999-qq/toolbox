/**
 * pdf-extract 纯函数：PDF 文本项 → 按行重组 → 按页合并。
 *
 * 不依赖 pdfjs-dist（文本项由 Tool.tsx 从 getTextContent() 映射为 PdfTextItem），
 * 因此本文件可被 vitest 完整覆盖（目标：语句 / 分支 / 函数 / 行 100%）。
 *
 * 行识别原理：按 y 坐标（PDF 用户空间，向上为正）降序，先排的是页上方的行；
 * 同行内按 x 升序；相邻行 y 差超过容差即换行；pdfjs 的 hasEOL 标记也触发换行。
 */

/** pdfjs 文本项的最小投影（Tool.tsx 里从 TextContent 映射） */
export interface PdfTextItem {
  readonly str: string
  /** PDF 用户空间坐标（点）；y 向上为正 */
  readonly x: number
  readonly y: number
  /** pdfjs 标记的行尾 */
  readonly hasEOL: boolean
}

/** PDF 文件的最小信息子集（File 的结构化替身，便于单元测试） */
export interface PdfFileInfo {
  readonly name: string
  readonly size: number
  readonly type: string
}

/** 页数上限：文本提取是纯 CPU 活，50 页以上提示拆分 */
export const MAX_PDF_PAGES = 50

/** 文件体积上限：100 MiB */
export const MAX_PDF_BYTES = 100 * 1024 * 1024

/** 行聚类的 y 容差（PDF 点） */
const ROW_Y_TOLERANCE = 2.5

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

/** 页数校验：0 页视为损坏；超 50 页拒绝并提示拆分 */
export function checkPdfPageCount(total: number): void {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error('PDF 页数为 0，文件可能已损坏')
  }
  if (total > MAX_PDF_PAGES) {
    throw new Error(`PDF 共 ${total} 页，超过 ${MAX_PDF_PAGES} 页上限，请拆分后分批提取`)
  }
}

/** 是否为 pdfjs 抛出的「需要密码」错误 */
export function isPasswordError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    if ((error as { name?: unknown }).name === 'PasswordException') return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return /password/i.test(message)
}

/** 把 pdfjs 加载异常翻译成中文：密码 / 损坏 / 其他 */
export function describePdfLoadError(error: unknown): string {
  if (isPasswordError(error)) {
    return '该 PDF 已加密，不支持提取文本，请先去除密码后重试'
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/invalid pdf|not a pdf|corrupt|损坏/i.test(message)) {
    return '文件损坏或不是有效的 PDF 文件，请检查后重试'
  }
  return `PDF 加载失败：${message}`
}

/**
 * 单页文本项 → 文本：空串丢弃；按 y 降序、x 升序排；
 * y 差超容差或 hasEOL 即换行；同行内用空格连接。
 */
export function extractPageText(items: readonly PdfTextItem[]): string {
  const sorted = items.filter((item) => item.str !== '').sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: string[] = []
  let current: string[] = []
  let currentY: number | null = null
  for (const item of sorted) {
    const newRow = currentY === null || Math.abs(item.y - currentY) > ROW_Y_TOLERANCE
    if (newRow && current.length > 0) {
      lines.push(current.join(' '))
      current = []
    }
    if (newRow) currentY = item.y
    current.push(item.str)
    if (item.hasEOL) {
      lines.push(current.join(' '))
      current = []
      currentY = null
    }
  }
  if (current.length > 0) lines.push(current.join(' '))
  return lines.join('\n')
}

/** 多页文本 → 输出：单页直接返回，多页加「第 N 页」分隔 */
export function combinePages(pages: readonly string[]): string {
  if (pages.length === 0) return ''
  if (pages.length === 1) return pages[0]
  return pages.map((text, index) => `--- 第 ${index + 1} 页 ---\n${text}`).join('\n\n')
}
