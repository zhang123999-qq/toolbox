/**
 * pdf-to-text 纯函数：文件校验（魔数/大小）、pdfjs 文本项排版还原、
 * 分页拼接、文件名构造。
 * 不触碰 DOM/React，不 import 其他工具；pdfjs-dist 只在 Tool.tsx 中使用。
 *
 * 文本项结构与 pdfjs-dist 的 TextItem / TextMarkedContent 同构：
 * TextItem = { str, dir, transform: [a,b,c,d,e,f], width, height, fontName, hasEOL }，
 * 其中 x = transform[4]、y = transform[5]（PDF 点坐标）。
 * transform/width 在此取 unknown，运行时做类型守卫，避免异常结构崩溃。
 */

/** pdfjs TextItem 的最小结构子集 */
export interface PdfTextItem {
  str: string
  hasEOL: boolean
  transform?: unknown
  width?: unknown
}

/** pdfjs TextMarkedContent 的最小结构子集（无 str，按标记内容跳过） */
export interface PdfTextMarkedContent {
  type: string
}

export type PdfTextContentItem = PdfTextItem | PdfTextMarkedContent

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 页与页之间的分页分隔符：换页符（form feed），纯文本阅读器可识别 */
export const PAGE_BREAK = '\f'

/** 同一视觉行的 y 坐标容差（PDF 点）；pdfjs 同行文本通常共享完全相同的 y */
const LINE_Y_TOLERANCE = 1

/** 同行相邻两项的 x 间隙超过该值（PDF 点）时补一个空格 */
const SPACE_GAP = 1

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为 PDF。
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

/**
 * 是否为 pdfjs 抛出的加密 PDF 错误。
 * pdfjs 的异常类在构造时设置 this.name（跨 realm 也稳定），
 * 按 name 识别比 instanceof 更可靠。
 */
export function isPasswordPdfError(err: unknown): boolean {
  return err instanceof Error && err.name === 'PasswordException'
}

/** 是否为真正的文本项（含 str），否则为 TextMarkedContent 之类的标记项 */
function isTextItem(item: PdfTextContentItem): item is PdfTextItem {
  return 'str' in item
}

/** 取文本项的 x 坐标（transform[4]），异常结构兜底为 0 */
function itemX(item: PdfTextItem): number {
  const t = item.transform
  return Array.isArray(t) && typeof t[4] === 'number' ? t[4] : 0
}

/** 取文本项的 y 坐标（transform[5]），异常结构兜底为 0 */
function itemY(item: PdfTextItem): number {
  const t = item.transform
  return Array.isArray(t) && typeof t[5] === 'number' ? t[5] : 0
}

/** 取文本项宽度，异常结构兜底为 0 */
function itemWidth(item: PdfTextItem): number {
  const w = item.width
  return typeof w === 'number' && Number.isFinite(w) ? w : 0
}

/**
 * 同行相邻两项之间是否需要补空格（调用方保证 prev/cur 的 str 均非空）：
 * 已有空白字符不补；否则按 x 间隙判断
 * （紧排的字形片段间隙≈0 不补，词间间隙>1pt 补一个空格）。
 */
function needsSpace(prev: PdfTextItem, cur: PdfTextItem): boolean {
  if (/\s$/.test(prev.str) || /^\s/.test(cur.str)) return false
  const gap = itemX(cur) - (itemX(prev) + itemWidth(prev))
  return gap > SPACE_GAP
}

/**
 * 把一页的 getTextContent() 文本项还原为带基本排版的文本：
 *  - 按 y 坐标分行（容差 LINE_Y_TOLERANCE），item.hasEOL 强制换行；
 *  - 同行项按 x 间隙补空格；
 *  - 标记内容（TextMarkedContent）跳过；
 *  - 每行尾部空白裁掉；整页首尾不留多余空行。
 * 空文本页返回 ''，由调用方展示占位文案，不抛错。
 */
export function extractPageText(items: PdfTextContentItem[]): string {
  const lines: string[] = []
  let parts: string[] = []
  // lineY === null 表示「当前行无内容」；prevPushed 为本行最后一个已入行的文本项，
  // 为 null 时与 lineY === null 等价（flushLine 内同步复位）
  let lineY: number | null = null
  let prevPushed: PdfTextItem | null = null
  let prevHasEOL = false
  const flushLine = (): void => {
    if (parts.length > 0) lines.push(parts.join('').replace(/\s+$/, ''))
    parts = []
    lineY = null
    prevPushed = null
  }
  for (const raw of items) {
    if (!isTextItem(raw)) continue
    const y = itemY(raw)
    if (lineY !== null && (prevHasEOL || Math.abs(y - lineY) > LINE_Y_TOLERANCE)) {
      flushLine()
    }
    if (raw.str !== '') {
      if (prevPushed === null) {
        lineY = y
      } else if (needsSpace(prevPushed, raw)) {
        parts.push(' ')
      }
      parts.push(raw.str)
      prevPushed = raw
    }
    prevHasEOL = raw.hasEOL
  }
  flushLine()
  return lines.join('\n')
}

/** 按页拼接：页与页之间用分页分隔符（换页符）连接 */
export function joinPageTexts(texts: string[]): string {
  return texts.join(PAGE_BREAK)
}

/** 构造输出文件名：原名去扩展名 + -text.txt，空名兜底 document */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-text.txt`
}
