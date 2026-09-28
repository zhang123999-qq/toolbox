/**
 * pdf-to-html 纯函数：PDF 文本项 → 行分组 → 结构化 HTML。
 *
 * 不依赖 pdfjs-dist（文本项由 Tool.tsx 从 getTextContent() 映射为 PdfTextItem），
 * 因此本文件可被 vitest 完整覆盖（目标：语句 / 分支 / 函数 / 行 100%）。
 * 所有文本内容都经过 escapeHtml，预览区可安全地 dangerouslySetInnerHTML。
 */

import type { PdfToHtmlOptions } from './schema'

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

/** 同一行的 y 容差（PDF 点） */
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
 * 行内按 x 排序后直接拼接；行字号取按字符数加权的平均值。
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

/** HTML 转义：& < > " ' */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 行对应的 HTML 块类型 */
export type HtmlBlockKind = 'heading1' | 'heading2' | 'listItem' | 'orderedItem' | 'paragraph'

export interface HtmlBlock {
  readonly kind: HtmlBlockKind
  readonly html: string
}

/** 是否列表行（无序符号或有序编号开头） */
function isListLine(text: string): boolean {
  return /^\s*(?:[•◦·●▪*-]|\d+[.)])\s+\S/.test(text)
}

/** 单行 → HTML 块（文本已转义） */
export function lineToHtmlBlock(
  line: PdfLine,
  median: number,
  options: PdfToHtmlOptions,
): HtmlBlock {
  const text = escapeHtml(line.text.trim())
  const level = headingLevel(line, median, options.detectHeadings)
  if (level === 1) return { kind: 'heading1', html: `<h1>${text}</h1>` }
  if (level === 2) return { kind: 'heading2', html: `<h2>${text}</h2>` }
  const ordered = /^\s*\d+[.)]\s+/.exec(line.text)
  if (ordered) {
    const body = escapeHtml(line.text.replace(/^\s*\d+[.)]\s+/, ''))
    return { kind: 'orderedItem', html: `<li>${body}</li>` }
  }
  if (isListLine(line.text)) {
    const body = escapeHtml(line.text.replace(/^\s*[•◦·●▪*-]\s+/, ''))
    return { kind: 'listItem', html: `<li>${body}</li>` }
  }
  return { kind: 'paragraph', html: `<p>${text}</p>` }
}

/**
 * 单页 → HTML 片段：连续无序列表项包进 <ul>，连续有序项包进 <ol>；
 * 空页给占位提示段落。
 */
export function pageToHtmlFragment(
  lines: readonly PdfLine[],
  pageNum: number,
  options: PdfToHtmlOptions,
): string {
  const open = `<section class="pdf-page" data-page="${pageNum}">`
  if (lines.length === 0) {
    return (
      open +
      '<p class="pdf-empty">（第 ' +
      pageNum +
      ' 页无文本，可能是扫描页，建议用 #500「PDF 文字识别（OCR）」）</p></section>'
    )
  }
  const median = medianFontSize(lines)
  const blocks = lines.map((line) => lineToHtmlBlock(line, median, options))
  const out: string[] = [open]
  // 当前打开的列表标签：null | 'ul' | 'ol'
  let openList: 'ul' | 'ol' | null = null
  const closeList = () => {
    if (openList !== null) {
      out.push(`</${openList}>`)
      openList = null
    }
  }
  for (const block of blocks) {
    const wantList = block.kind === 'listItem' ? 'ul' : block.kind === 'orderedItem' ? 'ol' : null
    if (wantList !== null) {
      if (openList !== wantList) {
        closeList()
        out.push(`<${wantList}>`)
        openList = wantList
      }
      out.push(block.html)
    } else {
      closeList()
      out.push(block.html)
    }
  }
  closeList()
  out.push('</section>')
  return out.join('\n')
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

/**
 * 多页 → body 片段；pageBreaks 开启时页间插 <hr>。
 * 返回的是片段（供预览 innerHTML）；下载用 wrapHtmlDocument 包成独立文档。
 */
export function pdfToHtmlFragments(
  pages: ReadonlyArray<readonly PdfLine[]>,
  options: PdfToHtmlOptions,
): string {
  assertPagesHaveText(pages)
  const separator = options.pageBreaks ? '\n<hr class="pdf-page-break">\n' : '\n'
  return pages.map((lines, i) => pageToHtmlFragment(lines, i + 1, options)).join(separator)
}

/** 片段包成可独立打开的 HTML 文档（含最小样式） */
export function wrapHtmlDocument(body: string, title: string): string {
  const safeTitle = escapeHtml(title)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.7;max-width:48rem;margin:0 auto;padding:1.5rem;color:#1e293b}
.pdf-page{margin-bottom:2rem}
.pdf-page-break{border:none;border-top:1px dashed #cbd5e1;margin:2rem 0}
.pdf-empty{color:#94a3b8}
h1{font-size:1.5rem}h2{font-size:1.25rem}
</style>
</head>
<body>
${body}
</body>
</html>
`
}
