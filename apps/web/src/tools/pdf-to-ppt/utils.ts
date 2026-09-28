/**
 * pdf-to-ppt 纯函数：文件校验（魔数/大小）、加密识别、
 * 文本坐标提取 → 行分组 → 英寸文本框、幻灯片版式计算、文件名构造。
 * 不触碰 React/DOM；pptxgenjs 的装配只在 Tool.tsx 中进行，可 100% 单测。
 */
import { PasswordException } from 'pdfjs-dist'

/**
 * getTextContent 文本条目的最小结构子集（pdfjs-dist 未从入口导出 TextContent 类型）：
 * 带 transform 的文本片段，或无 transform 的 marked content。
 */
export interface PdfTextItem {
  str: string
  /** 变换矩阵 [a,b,c,d,e,f]：(e,f) 为基线起点（PDF 坐标系：左下原点，y 向上，单位点） */
  transform: number[]
  width: number
  height: number
}

export type TextContentItem = PdfTextItem | { type: string; id: string }

/**
 * 英寸坐标系文本框（pptxgenjs 定位单位：左上原点，y 向下，单位英寸）；
 * fontSize 单位为磅（pptxgenjs 直接接受磅值）。
 */
export interface TextBox {
  text: string
  x: number
  y: number
  w: number
  h: number
  fontSize: number
}

/** PDF 页面尺寸（点，1 点 = 1/72 英寸） */
export interface PageSize {
  width: number
  height: number
}

/** 幻灯片版式尺寸（英寸，pptxgenjs defineLayout 单位） */
export interface SlideSize {
  width: number
  height: number
}

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 1 英寸 = 72 点 */
export const PT_PER_INCH = 72

/** 幻灯片边长上限（英寸）：超大页面等比压入，避免非法版式尺寸 */
export const MAX_SLIDE_INCHES = 56
/** 幻灯片边长下限（英寸）：过小页面放大到可用尺寸 */
export const MIN_SLIDE_INCHES = 1

/** 行高系数：文本框高度 = 字号 × 1.2 */
const LINE_HEIGHT_FACTOR = 1.2
/** 上伸系数：基线到框顶 ≈ 字号 × 0.85（近似 ascent） */
const ASCENT_FACTOR = 0.85
/** 同行判定容差系数：与组首基线差 ≤ max(1pt, 字号 × 0.5) 视为同行 */
const LINE_TOLERANCE_FACTOR = 0.5
/** 词间空格判定：片段间隔 > 字号 × 0.25 时补一个空格 */
const WORD_GAP_FACTOR = 0.25
/** 零宽/缺失宽度信息时的保底框宽（em 数），保证文本框可见 */
const MIN_WIDTH_EM = 0.6

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为可转换的 PDF。
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
 * 是否为 pdfjs-dist 抛出的加密 PDF 错误（PasswordException）。
 * 名称兜底：跨 realm / 模块 mock 场景下 instanceof 可能失效。
 */
export function isEncryptedPdfError(err: unknown): boolean {
  return (
    err instanceof PasswordException || (err instanceof Error && err.name === 'PasswordException')
  )
}

/**
 * 字号估计：水平文本取 |d|；旋转文本 d=0 时退化为 |a|；都为 0 时兜底 12pt。
 * transform 为 [a,b,c,d,e,f]，d 是字号在 y 方向的缩放。
 */
function itemFontSize(transform: number[]): number {
  const d = Math.abs(transform[3])
  if (d > 0) return d
  const a = Math.abs(transform[0])
  return a > 0 ? a : 12
}

interface PlacedItem {
  x: number
  baseY: number
  fontSize: number
  width: number
  str: string
}

interface TextLine {
  baseY: number
  items: PlacedItem[]
}

/**
 * 将 getTextContent 的条目转为英寸文本框：
 * - 跳过无 transform 的 marked content 与空串条目；
 * - 按基线 y 分组为行：PDF y 向上，先按 y 降序使阅读顺序自上而下；
 * - 行内按 x 升序排列，片段间隔明显且两侧无空白时补一个空格；
 * - PDF 坐标（左下原点，y 向上，点）→ 英寸（左上原点，y 向下）。
 */
export function itemsToTextBoxes(
  items: readonly TextContentItem[],
  pageHeightPts: number,
): TextBox[] {
  const placed: PlacedItem[] = []
  for (const item of items) {
    if (!('transform' in item)) continue
    if (item.str === '') continue
    placed.push({
      x: item.transform[4],
      baseY: item.transform[5],
      fontSize: itemFontSize(item.transform),
      width: item.width,
      str: item.str,
    })
  }
  placed.sort((a, b) => b.baseY - a.baseY || a.x - b.x)
  const lines: TextLine[] = []
  for (const p of placed) {
    const last = lines[lines.length - 1]
    if (
      last !== undefined &&
      Math.abs(p.baseY - last.baseY) <= Math.max(1, p.fontSize * LINE_TOLERANCE_FACTOR)
    ) {
      last.items.push(p)
    } else {
      lines.push({ baseY: p.baseY, items: [p] })
    }
  }
  return lines.map((line) => lineToBox(line, pageHeightPts))
}

/** 单行 → 文本框：拼文本、算包围盒、换算为英寸 */
function lineToBox(line: TextLine, pageHeightPts: number): TextBox {
  const sorted = [...line.items].sort((a, b) => a.x - b.x)
  let text = ''
  let prevEnd = Number.NEGATIVE_INFINITY
  let prevEndsWithSpace = true
  let minX = Infinity
  let maxEnd = -Infinity
  let maxFont = 0
  for (const it of sorted) {
    const gap = it.x - prevEnd
    if (!prevEndsWithSpace && gap > it.fontSize * WORD_GAP_FACTOR && !/^\s/.test(it.str)) {
      text += ' '
    }
    text += it.str
    prevEnd = it.x + it.width
    prevEndsWithSpace = /\s$/.test(it.str)
    if (it.x < minX) minX = it.x
    if (prevEnd > maxEnd) maxEnd = prevEnd
    if (it.fontSize > maxFont) maxFont = it.fontSize
  }
  const widthPts = Math.max(maxEnd - minX, maxFont * MIN_WIDTH_EM)
  const heightPts = maxFont * LINE_HEIGHT_FACTOR
  return {
    text,
    x: minX / PT_PER_INCH,
    y: (pageHeightPts - line.baseY - maxFont * ASCENT_FACTOR) / PT_PER_INCH,
    w: widthPts / PT_PER_INCH,
    h: heightPts / PT_PER_INCH,
    fontSize: maxFont,
  }
}

/** 版式边长钳制到 [MIN_SLIDE_INCHES, MAX_SLIDE_INCHES] */
function clampSlideInches(v: number): number {
  return Math.min(Math.max(v, MIN_SLIDE_INCHES), MAX_SLIDE_INCHES)
}

/**
 * 以第一页尺寸确定整份文稿的版式（pptxgenjs 要求全局单一版式，
 * 多尺寸混排的 PDF 后续页按比例映射，见 fitBoxToLayout）：
 * 点 → 英寸并钳制。
 */
export function computeSlideLayout(firstPage: PageSize): SlideSize {
  return {
    width: clampSlideInches(firstPage.width / PT_PER_INCH),
    height: clampSlideInches(firstPage.height / PT_PER_INCH),
  }
}

/**
 * 把某页的英寸文本框映射到文稿版式：
 * 位置/尺寸按「版式 ÷ 本页」比例缩放；字号取横纵缩放的较小者，避免拉伸变形；
 * 页面尺寸非法（≤ 0）时缩放退化为 1，原样放置。
 */
export function fitBoxToLayout(box: TextBox, page: PageSize, layout: SlideSize): TextBox {
  const pageWIn = page.width / PT_PER_INCH
  const pageHIn = page.height / PT_PER_INCH
  const sx = pageWIn > 0 ? layout.width / pageWIn : 1
  const sy = pageHIn > 0 ? layout.height / pageHIn : 1
  const s = Math.min(sx, sy)
  return {
    text: box.text,
    x: box.x * sx,
    y: box.y * sy,
    w: box.w * sx,
    h: box.h * sy,
    fontSize: box.fontSize * s,
  }
}

/** 构造输出文件名：原名 + -converted.pptx */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-converted.pptx`
}
