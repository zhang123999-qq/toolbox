/**
 * pdf-to-markdown 纯函数：PDF 文本项 → 行分组 → Markdown。
 *
 * 不依赖 pdfjs-dist（文本项由 Tool.tsx 从 getTextContent() 映射为 PdfTextItem），
 * 因此本文件可被 vitest 完整覆盖（目标：语句 / 分支 / 函数 / 行 100%）。
 */

import type { PdfToMarkdownOptions } from './schema'

/** pdfjs 文本项的最小投影（Tool.tsx 里从 TextContent 映射） */
export interface PdfTextItem {
  readonly str: string
  /** PDF 用户空间坐标（点）；y 向上为正 */
  readonly x: number
  readonly y: number
  /** 字号近似值（水平文本取 transform[0] 的绝对值） */
  readonly fontSize: number
}

/** 按行聚好的一行 */
export interface PdfLine {
  readonly text: string
  readonly fontSize: number
  readonly y: number
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

/** 同一行的 y 容差（PDF 点）；同一行内基线漂移一般 < 1pt */
const LINE_Y_TOLERANCE = 2.5

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
    throw new Error('无法读取 PDF 页数，文件可能已损坏')
  }
  if (total > MAX_PDF_PAGES) {
    throw new Error(`PDF 共 ${total} 页，超过 ${MAX_PDF_PAGES} 页上限，请拆分后分批转换`)
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

/** PDF 加载阶段的错误 → 中文提示（加密 / 损坏 / 其他） */
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
 * 文本项按行分组：先按 y 降序、x 升序排；y 差在容差内归为一行，
 * 行内按 x 排序后直接拼接（pdfjs 的 str 通常已含词间空格）。
 * 行字号取按字符数加权的平均值。
 */
export function groupItemsIntoLines(items: readonly PdfTextItem[]): PdfLine[] {
  const kept = items.filter((item) => item.str !== '')
  const sorted = [...kept].sort((a, b) => (b.y !== a.y ? b.y - a.y : a.x - b.x))
  const lines: PdfLine[] = []
  let current: PdfTextItem[] = []
  let lineY = 0
  const flush = () => {
    if (current.length === 0) return
    const ordered = [...current].sort((a, b) => a.x - b.x)
    const text = ordered.map((item) => item.str).join('')
    const chars = ordered.reduce((sum, item) => sum + item.str.length, 0)
    // kept 已滤掉空串，chars 恒 ≥1
    const fontSize = ordered.reduce((sum, item) => sum + item.fontSize * item.str.length, 0) / chars
    lines.push({ text, fontSize, y: lineY })
    current = []
  }
  for (const item of sorted) {
    if (current.length === 0 || Math.abs(item.y - lineY) <= LINE_Y_TOLERANCE) {
      if (current.length === 0) lineY = item.y
      current.push(item)
    } else {
      flush()
      lineY = item.y
      current.push(item)
    }
  }
  flush()
  return lines
}

/** 行字号的中位数；空行集返回 0 */
export function medianFontSize(lines: readonly PdfLine[]): number {
  if (lines.length === 0) return 0
  const sizes = lines.map((line) => line.fontSize).sort((a, b) => a - b)
  const mid = Math.floor(sizes.length / 2)
  return sizes.length % 2 === 1 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2
}

/**
 * 标题级别启发式：短行（≤60 字）且字号显著大于正文。
 * ≥1.5× 中位数 → 一级；≥1.25× → 二级；否则 0（正文）。
 * detectHeadings 关闭时一律返回 0。
 */
export function headingLevel(line: PdfLine, median: number, detectHeadings: boolean): 0 | 1 | 2 {
  if (!detectHeadings) return 0
  if (median <= 0 || line.fontSize <= 0) return 0
  if (line.text.trim() === '' || [...line.text.trim()].length > 60) return 0
  const ratio = line.fontSize / median
  if (ratio >= 1.5) return 1
  if (ratio >= 1.25) return 2
  return 0
}

/** 是否列表行（无序符号或有序编号开头） */
function isListLine(text: string): boolean {
  return /^\s*(?:[•◦·●▪*-]|\d+[.)])\s+\S/.test(text)
}

/** 行首无序符号统一为 `- ` */
function normalizeBullet(text: string): string {
  return text.replace(/^\s*[•◦·●▪*]\s+/, '- ')
}

/**
 * 行首本是 Markdown 语法字符（# / >）但没被识别为标题/引用时，
 * 转义首字符，避免渲染走样。
 */
function escapeLeadingSyntax(text: string): string {
  if (/^\s*(#{1,6}\s|>)/.test(text)) return text.replace(/^\s*/, (m) => m + '\\')
  return text
}

/** 单行 → Markdown */
export function lineToMarkdown(
  line: PdfLine,
  median: number,
  options: PdfToMarkdownOptions,
): string {
  const level = headingLevel(line, median, options.detectHeadings)
  const text = line.text.trim()
  if (level === 1) return '# ' + text
  if (level === 2) return '## ' + text
  if (isListLine(text)) return normalizeBullet(text)
  return escapeLeadingSyntax(text)
}

/** 渲染后的行是否列表项（`- ` 或有序编号开头） */
function isRenderedListLine(rendered: string): boolean {
  return /^(-\s|\d+[.)]\s)/.test(rendered)
}

/**
 * 单页 → Markdown：段落间空一行；连续的列表行之间只换行不空行；
 * 空页（无文本的扫描页）给占位提示。
 */
export function pageToMarkdown(
  lines: readonly PdfLine[],
  pageNum: number,
  options: PdfToMarkdownOptions,
): string {
  if (lines.length === 0) {
    return `> （第 ${pageNum} 页无文本，可能是扫描页，建议用 #500「PDF 文字识别（OCR）」）`
  }
  const median = medianFontSize(lines)
  const rendered = lines.map((line) => lineToMarkdown(line, median, options))
  const out: string[] = []
  for (let i = 0; i < rendered.length; i += 1) {
    const cur = rendered[i]
    if (i === 0) {
      out.push(cur)
      continue
    }
    const prev = rendered[i - 1]
    out.push((isRenderedListLine(prev) && isRenderedListLine(cur) ? '\n' : '\n\n') + cur)
  }
  return out.join('')
}

/** 整篇断言：所有页都没文字 → 抛错并建议用 #500 OCR */
export function assertPagesHaveText(pages: ReadonlyArray<readonly PdfLine[]>): void {
  const totalChars = pages.reduce(
    (sum, lines) => sum + lines.reduce((s, line) => s + line.text.trim().length, 0),
    0,
  )
  if (totalChars === 0) {
    throw new Error('PDF 中没有可提取的文字（可能是扫描版），建议使用 #500「PDF 文字识别（OCR）」')
  }
}

/** 多页 → 完整 Markdown；pageBreaks 开启时页间插 `---` 分隔线 */
export function pdfToMarkdown(
  pages: ReadonlyArray<readonly PdfLine[]>,
  options: PdfToMarkdownOptions,
): string {
  assertPagesHaveText(pages)
  const separator = options.pageBreaks ? '\n\n---\n\n' : '\n\n'
  return pages.map((lines, i) => pageToMarkdown(lines, i + 1, options)).join(separator)
}
