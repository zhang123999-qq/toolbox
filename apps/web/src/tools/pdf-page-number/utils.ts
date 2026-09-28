/**
 * pdf-page-number 纯函数：参数解析校验、页码文本格式化、位置坐标计算、PDF 页码绘制。
 * 不触碰 DOM；pdf-lib 为纯 JS（无 DOM 依赖），可 100% 单测。
 *
 * 说明：页码文本只用纯 ASCII（Helvetica 标准字体不支持中文）；
 * 「第n页」样式用等价的英文 `page n` 替代，详见 README。
 */
import { PDFDocument, StandardFonts } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export const DEFAULT_FONT_SIZE = 12
export const MIN_FONT_SIZE = 6
export const MAX_FONT_SIZE = 72

export const DEFAULT_MARGIN = 36
export const MIN_MARGIN = 0
export const MAX_MARGIN = 200

export const DEFAULT_START_NUMBER = 1
export const MAX_START_NUMBER = 9999999

/** 页码样式：n=纯数字；nOfN=n/N；page=page n（「第n页」的 ASCII 等价写法） */
export type PageNumberStyle = 'n' | 'nOfN' | 'page'

/** 页码位置：上/下 × 左/中/右，共 6 档 */
export type PageNumberPosition =
  'topLeft' | 'topCenter' | 'topRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight'

export interface AddPageNumbersOptions {
  position: PageNumberPosition
  style: PageNumberStyle
  /** 起始编号（第 fromPage 页显示的数字），≥0 */
  startNumber: number
  /** 从第几页开始加页码（1 起），≤ 总页数 */
  fromPage: number
  /** 字号 pt，6–72 */
  fontSize: number
  /** 边距 pt，0–200 */
  margin: number
}

export interface TextPosition {
  x: number
  y: number
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
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

/** 魔数不符时抛错（中文直述，便于组件直接展示） */
export function assertPdfFile(bytes: Uint8Array): void {
  if (!isPdfFile(bytes)) {
    throw new Error('不是有效的 PDF 文件（文件头缺少 %PDF 标识）')
  }
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
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

/**
 * PDF 载入失败转用户可读错误：加密单独说明，其余透出原始信息。
 * 纯中文直述（组件层不做二次转译，便于单测断言）。
 */
export function loadErrorMessage(err: unknown): string {
  if (isEncryptedPdfError(err)) return 'PDF 已加密，不支持添加页码'
  return `PDF 读取失败：${errorMessage(err)}`
}

/** 解析起始编号：空串用默认 1；须为非负整数，上限 9999999 */
export function parseStartNumber(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_START_NUMBER
  if (!/^\d+$/.test(t)) throw new Error(`起始编号无效：${raw}（须为非负整数）`)
  const n = Number(t)
  if (n > MAX_START_NUMBER) throw new Error(`起始编号过大：${raw}（上限 ${MAX_START_NUMBER}）`)
  return n
}

/** 解析起始页：空串用默认 1；须为 ≥1 的整数 */
export function parseFromPage(raw: string): number {
  const t = raw.trim()
  if (t === '') return 1
  if (!/^\d+$/.test(t)) throw new Error(`起始页无效：${raw}（须为 ≥1 的整数）`)
  const n = Number(t)
  if (n < 1) throw new Error(`起始页无效：${raw}（须为 ≥1 的整数）`)
  return n
}

/** 解析字号：空串用默认 12；范围 6–72pt */
export function parseFontSize(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_FONT_SIZE
  if (!/^\d+$/.test(t)) throw new Error(`字号无效：${raw}（须为整数）`)
  const n = Number(t)
  if (n < MIN_FONT_SIZE || n > MAX_FONT_SIZE) {
    throw new Error(`字号超出范围：${raw}（须为 ${MIN_FONT_SIZE}–${MAX_FONT_SIZE}）`)
  }
  return n
}

/** 解析边距：空串用默认 36；范围 0–200pt */
export function parseMargin(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_MARGIN
  if (!/^\d+$/.test(t)) throw new Error(`边距无效：${raw}（须为整数）`)
  const n = Number(t)
  if (n < MIN_MARGIN || n > MAX_MARGIN) {
    throw new Error(`边距超出范围：${raw}（须为 ${MIN_MARGIN}–${MAX_MARGIN}）`)
  }
  return n
}

/** 起始页（1 起）不得超过总页数 */
export function assertFromPageInRange(fromPage: number, totalPages: number): void {
  if (fromPage > totalPages) {
    throw new Error(`起始页 ${fromPage} 超出总页数 ${totalPages}`)
  }
}

/** 页码文本格式化：三种纯 ASCII 样式 */
export function formatPageNumber(
  style: PageNumberStyle,
  pageNum: number,
  totalPages: number,
): string {
  if (style === 'nOfN') return `${pageNum}/${totalPages}`
  if (style === 'page') return `page ${pageNum}`
  return `${pageNum}`
}

/** 需要加页码的页面下标（0 起）：从 fromPage-1 到最后一页 */
export function computePageIndices(fromPage: number, totalPages: number): number[] {
  const indices: number[] = []
  for (let i = fromPage - 1; i < totalPages; i++) {
    indices.push(i)
  }
  return indices
}

/**
 * 文本宽度估算：按 Helvetica 各字符平均宽度（em 为单位）× 字号。
 * 数字等宽 0.556；斜杠/空格/点 0.278；小写字母 0.55；大写 0.67；其余 0.5。
 * 纯函数可测；绘制时调用方也可用 font.widthOfTextAtSize 得到精确值。
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') units += 0.556
    else if (ch === '/' || ch === ' ' || ch === '.') units += 0.278
    else if (ch >= 'a' && ch <= 'z') units += 0.55
    else if (ch >= 'A' && ch <= 'Z') units += 0.67
    else units += 0.5
  }
  return units * fontSize
}

/**
 * 页码绘制原点（pdf-lib drawText 的 x/y 为文本基线起点）。
 * x：左=边距；中=(页宽-文本宽)/2；右=页宽-边距-文本宽。
 * y：下=边距；上=页高-边距-字号（字号近似行高，文本顶部约贴边距）。
 */
export function calcPosition(
  position: PageNumberPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
  margin: number,
): TextPosition {
  const x =
    position === 'topLeft' || position === 'bottomLeft'
      ? margin
      : position === 'topCenter' || position === 'bottomCenter'
        ? (pageWidth - textWidth) / 2
        : pageWidth - margin - textWidth
  const y =
    position === 'topLeft' || position === 'topCenter' || position === 'topRight'
      ? pageHeight - margin - fontSize
      : margin
  return { x, y }
}

/** 构造输出文件名：原名 + -pagenumber.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'numbered'
  return `${base}-pagenumber.pdf`
}

/**
 * 为 PDF 每页（从 fromPage 起）绘制页码：载入（不更新元数据）→ 嵌入
 * Helvetica → 逐页 drawText → 保存。起始编号按绘制顺序递增。
 * 加密/损坏的 PDF 在 load 阶段抛错，由调用方转译。
 */
export async function addPageNumbers(
  bytes: Uint8Array,
  opts: AddPageNumbersOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const totalPages = doc.getPageCount()
  assertFromPageInRange(opts.fromPage, totalPages)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const indices = computePageIndices(opts.fromPage, totalPages)
  for (const index of indices) {
    const page = doc.getPage(index)
    const { width, height } = page.getSize()
    const num = opts.startNumber + (index - (opts.fromPage - 1))
    const text = formatPageNumber(opts.style, num, totalPages)
    const textWidth = font.widthOfTextAtSize(text, opts.fontSize)
    const { x, y } = calcPosition(
      opts.position,
      width,
      height,
      textWidth,
      opts.fontSize,
      opts.margin,
    )
    page.drawText(text, { x, y, size: opts.fontSize, font })
  }
  const saved: Uint8Array = await doc.save()
  // 拷贝为确定性的 ArrayBuffer 视图，调用方可直接作 BlobPart
  return new Uint8Array(saved)
}
