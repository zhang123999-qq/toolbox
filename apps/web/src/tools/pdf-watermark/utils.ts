/**
 * pdf-watermark 纯函数：参数解析、页面范围解析、九宫格坐标计算、
 * 颜色/图片类型识别、PDF 水印叠加（pdf-lib 为纯 JS，无 DOM 依赖）。
 * 不触碰 React/DOM，不 import 其他工具，可 100% 单测。
 */
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import type { PageMode, WatermarkPosition } from './schema'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export const DEFAULT_OPACITY = 50
export const DEFAULT_FONT_SIZE = 48
export const DEFAULT_ROTATE = 45
export const DEFAULT_SCALE = 100
/** 水印包围盒与页边的默认最小间距（pt） */
export const WATERMARK_MARGIN = 36

/** 九宫格位置 id（行优先），供 Tool.tsx 渲染 3×3 选择器 */
export const POSITION_IDS = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
] as const satisfies readonly WatermarkPosition[]

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，损坏/加密的判定交给 pdf-lib。
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
 * 上传阶段仅用于展示，真正的校验错误在加水印阶段报出。
 */
export async function tryGetPageCount(bytes: Uint8Array): Promise<number | null> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false })
    return doc.getPageCount()
  } catch {
    return null
  }
}

/** 透明度 10–100（%）；空串用默认 50 */
export function parseOpacity(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_OPACITY
  if (!/^\d+$/.test(t)) throw new Error(`透明度无效：${raw}（须为 10–100 的整数）`)
  const v = Number(t)
  if (v < 10 || v > 100) throw new Error(`透明度超出范围：${raw}（须为 10–100 的整数）`)
  return v
}

/** 字号 8–200（pt）；空串用默认 48 */
export function parseFontSize(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_FONT_SIZE
  if (!/^\d+$/.test(t)) throw new Error(`字号无效：${raw}（须为 8–200 的整数）`)
  const v = Number(t)
  if (v < 8 || v > 200) throw new Error(`字号超出范围：${raw}（须为 8–200 的整数）`)
  return v
}

/** 旋转角度 -180–180（度，允许小数）；空串用默认 45 */
export function parseRotate(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_ROTATE
  if (!/^-?\d+(\.\d+)?$/.test(t)) throw new Error(`旋转角度无效：${raw}（须为 -180–180 的数字）`)
  const v = Number(t)
  if (v < -180 || v > 180) throw new Error(`旋转角度超出范围：${raw}（须为 -180–180 的数字）`)
  return v
}

/** 图片缩放 10–200（%）；空串用默认 100 */
export function parseScale(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_SCALE
  if (!/^\d+$/.test(t)) throw new Error(`缩放无效：${raw}（须为 10–200 的整数）`)
  const v = Number(t)
  if (v < 10 || v > 200) throw new Error(`缩放超出范围：${raw}（须为 10–200 的整数）`)
  return v
}

/**
 * 解析页面范围 "1-3,5" → 从 0 起的页索引数组（去重、升序）。
 * 空串返回 []（调用方按 pageMode 决定是否回退为全部页面）。
 * 页码为 1 起；越界/格式错误抛错。
 */
export function parsePageRanges(raw: string, pageCount: number): number[] {
  const t = raw.trim()
  if (t === '') return []
  const pages = new Set<number>()
  const add = (n: number): void => {
    if (!Number.isInteger(n) || n < 1 || n > pageCount) {
      throw new Error(`页码超出范围：${n}（共 ${pageCount} 页）`)
    }
    pages.add(n - 1)
  }
  for (const part of t.split(',')) {
    const p = part.trim()
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(p)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      if (a > b) throw new Error(`页面范围无效："${p}"（起始页大于结束页）`)
      for (let n = a; n <= b; n++) add(n)
    } else if (/^\d+$/.test(p)) {
      add(Number(p))
    } else {
      throw new Error(`页面范围无效："${p}"（格式应为 1-3,5）`)
    }
  }
  return [...pages].sort((x, y) => x - y)
}

/**
 * pageMode=all → 全部页索引；custom → 解析 pageRange，
 * 解析结果为空（空串）时同样回退为全部页面。
 */
export function resolvePageIndices(
  pageMode: PageMode,
  pageRange: string,
  pageCount: number,
): number[] {
  if (pageCount < 1) throw new Error('PDF 没有页面')
  if (pageMode === 'all') return Array.from({ length: pageCount }, (_, i) => i)
  const parsed = parsePageRanges(pageRange, pageCount)
  return parsed.length > 0 ? parsed : Array.from({ length: pageCount }, (_, i) => i)
}

/**
 * 九宫格位置 → 水印包围盒左下角坐标（PDF 坐标系，原点在左下角）。
 * margin 为水印与页边的最小间距；水印大于页面时坐标可能为负，调用方可自行决定是否缩放。
 */
export function computeWatermarkXY(
  pageW: number,
  pageH: number,
  wmW: number,
  wmH: number,
  position: WatermarkPosition,
  margin = WATERMARK_MARGIN,
): { x: number; y: number } {
  for (const v of [pageW, pageH, wmW, wmH]) {
    if (!Number.isFinite(v) || v <= 0) throw new Error('尺寸无效：页面与水印宽高须为正数')
  }
  if (!Number.isFinite(margin) || margin < 0) throw new Error('边距无效：须为非负数')
  const cx = (pageW - wmW) / 2
  const cy = (pageH - wmH) / 2
  switch (position) {
    case 'top-left':
      return { x: margin, y: pageH - wmH - margin }
    case 'top':
      return { x: cx, y: pageH - wmH - margin }
    case 'top-right':
      return { x: pageW - wmW - margin, y: pageH - wmH - margin }
    case 'left':
      return { x: margin, y: cy }
    case 'center':
      return { x: cx, y: cy }
    case 'right':
      return { x: pageW - wmW - margin, y: cy }
    case 'bottom-left':
      return { x: margin, y: margin }
    case 'bottom':
      return { x: cx, y: margin }
    case 'bottom-right':
      return { x: pageW - wmW - margin, y: margin }
  }
}

/** '#rrggbb' → pdf-lib 可用的 0–1 RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) throw new Error(`颜色无效：${hex}（须为 #rrggbb 格式）`)
  const v = parseInt(m[1], 16)
  return { r: ((v >> 16) & 0xff) / 255, g: ((v >> 8) & 0xff) / 255, b: (v & 0xff) / 255 }
}

/**
 * 文字水印校验：非空，且仅含 ASCII 字符。
 * pdf-lib 内嵌的 Helvetica 没有 CJK 字形，中文字符会渲染为缺失字形；
 * 与其输出乱码，不如直接拒绝并在界面明确提示（诚实的产品决策，见 README）。
 */
export function assertTextWatermarkOk(text: string): void {
  if (text.trim() === '') throw new Error('水印文字不能为空')
  for (const ch of text) {
    // 不用 /[^\x00-\x7F]/ 正则：含控制字符转义会触发 no-control-regex
    if (ch.charCodeAt(0) > 0x7f) {
      throw new Error('水印文字仅支持 ASCII/英文字符（Helvetica 字体不支持中文）')
    }
  }
}

/** 按魔数识别水印图片类型：PNG（89 50 4E 47）/ JPEG（FF D8）；其他抛错 */
export function detectImageKind(bytes: Uint8Array): 'png' | 'jpg' {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png'
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'jpg'
  }
  throw new Error('水印图片须为 PNG 或 JPEG 格式')
}

/** 构造输出文件名：原名 + -watermarked.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-watermarked.pdf`
}

export interface TextWatermarkParams {
  text: string
  /** 字号 pt（8–200） */
  fontSize: number
  /** '#rrggbb' */
  colorHex: string
  /** 0–1 */
  opacity: number
  /** 旋转角度（度） */
  rotate: number
  position: WatermarkPosition
  pageMode: PageMode
  pageRange: string
}

/**
 * 文字水印：逐页 drawText。加密 PDF 在 PDFDocument.load 抛出
 * EncryptedPDFError，向上传播由调用方转译为面向用户的提示。
 */
export async function applyTextWatermark(
  pdfBytes: Uint8Array,
  params: TextWatermarkParams,
): Promise<Uint8Array> {
  assertTextWatermarkOk(params.text)
  const color = hexToRgb(params.colorHex)
  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false })
  const indices = resolvePageIndices(params.pageMode, params.pageRange, doc.getPageCount())
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const textWidth = font.widthOfTextAtSize(params.text, params.fontSize)
  const pages = doc.getPages()
  for (const i of indices) {
    const page = pages[i]
    const { width: pw, height: ph } = page.getSize()
    const { x, y } = computeWatermarkXY(pw, ph, textWidth, params.fontSize, params.position)
    page.drawText(params.text, {
      x,
      y,
      size: params.fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity: params.opacity,
      rotate: degrees(params.rotate),
    })
  }
  const saved: Uint8Array = await doc.save()
  // 拷贝为确定性的 ArrayBuffer 视图，调用方可直接作 BlobPart
  return new Uint8Array(saved)
}

export interface ImageWatermarkParams {
  imageBytes: Uint8Array
  imageKind: 'png' | 'jpg'
  /** 缩放百分比 10–200（相对图片原始点尺寸） */
  scale: number
  /** 0–1 */
  opacity: number
  position: WatermarkPosition
  pageMode: PageMode
  pageRange: string
}

/** 图片水印：逐页 drawImage，按 scale 等比缩放后按九宫格定位 */
export async function applyImageWatermark(
  pdfBytes: Uint8Array,
  params: ImageWatermarkParams,
): Promise<Uint8Array> {
  if (params.imageBytes.length === 0) throw new Error('水印图片为空')
  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false })
  const image =
    params.imageKind === 'png'
      ? await doc.embedPng(params.imageBytes)
      : await doc.embedJpg(params.imageBytes)
  const dims = image.scale(params.scale / 100)
  const indices = resolvePageIndices(params.pageMode, params.pageRange, doc.getPageCount())
  const pages = doc.getPages()
  for (const i of indices) {
    const page = pages[i]
    const { width: pw, height: ph } = page.getSize()
    const { x, y } = computeWatermarkXY(pw, ph, dims.width, dims.height, params.position)
    page.drawImage(image, {
      x,
      y,
      width: dims.width,
      height: dims.height,
      opacity: params.opacity,
    })
  }
  const saved: Uint8Array = await doc.save()
  // 拷贝为确定性的 ArrayBuffer 视图，调用方可直接作 BlobPart
  return new Uint8Array(saved)
}
