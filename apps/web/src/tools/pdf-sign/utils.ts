/**
 * pdf-sign 纯函数：文件校验（魔数/大小）、签名图片种类识别与尺寸解析、
 * data URL 解码、滑杆参数解析、画布坐标映射、签名落点计算、pdf-lib 嵌入。
 * 不触碰 React/DOM；pdf-lib 为纯 JS（无 DOM 依赖），可 100% 单测。
 *
 * 注意：本工具只做可视化签名（把签名位图画到页面上），绝不伪造
 * 数字证书签名；embedSignature 仅调用 pdf-lib 的 drawImage，不写
 * 任何签名字典（/Sig /ByteRange），输出 PDF 不含密码学签名结构。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 手写签名画布内部分辨率（CSS 自适应拉伸，指针坐标按比例映射） */
export const SIG_CANVAS_WIDTH = 600
export const SIG_CANVAS_HEIGHT = 200

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

/** 签名图片种类：pdf-lib 仅支持嵌入 PNG / JPEG */
export type SignatureImageKind = 'png' | 'jpg'

function isPngMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
}

function isJpegMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8
}

/**
 * 识别签名图片种类；非 PNG/JPEG 返回 null（pdf-lib 无法嵌入，
 * 调用方提示用户换图）。
 */
export function detectImageKind(bytes: Uint8Array): SignatureImageKind | null {
  if (isPngMagic(bytes)) return 'png'
  if (isJpegMagic(bytes)) return 'jpg'
  return null
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/**
 * 解析 PNG 图片宽高（只读文件头 IHDR，不做全图解码）。
 * IHDR 必须紧跟 8 字节魔数：4 字节长度（须为 13）+ 'IHDR' + 宽高各 4 字节。
 */
export function getPngDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 24) throw new Error('签名图片无效：PNG 文件过短')
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) throw new Error('签名图片无效：非 PNG 文件')
  }
  const ihdrLen = (bytes[8] << 24) | (bytes[9] << 16) | (bytes[10] << 8) | bytes[11]
  const ihdrType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
  if (ihdrLen !== 13 || ihdrType !== 'IHDR') {
    throw new Error('签名图片无效：PNG 缺少 IHDR 块')
  }
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
  if (width <= 0 || height <= 0) throw new Error('签名图片无效：PNG 尺寸异常')
  return { width, height }
}

/**
 * 解析 JPEG 图片宽高（扫描标记找 SOF0–SOF15，读其中宽高字段）。
 * 只读文件头，不解压图像数据；遇到 EOI 仍未找到 SOF 即抛错。
 */
export function getJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('签名图片无效：非 JPEG 文件')
  }
  let offset = 2 // 跳过 SOI
  for (;;) {
    if (offset + 2 > bytes.length) throw new Error('签名图片无效：JPEG 数据截断')
    if (bytes[offset] !== 0xff) throw new Error('签名图片无效：JPEG 标记错误')
    const marker = bytes[offset + 1]
    // SOF0–SOF15（排除 DHT/DAC/JPG 扩展标记）携带宽高：
    // 标记 2 字节 + 段长度 2 字节 + 精度 1 字节 + 高 2 字节 + 宽 2 字节
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (offset + 9 > bytes.length) throw new Error('签名图片无效：JPEG 数据截断')
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6]
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8]
      if (width <= 0 || height <= 0) throw new Error('签名图片无效：JPEG 尺寸异常')
      return { width, height }
    }
    if (marker === 0xd9) throw new Error('签名图片无效：未找到尺寸信息（SOF 标记）')
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2 // 无长度段的独立标记（TEM / RST0–RST7）
    } else {
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3]
      if (segLen < 2) throw new Error('签名图片无效：JPEG 段长度错误')
      offset += 2 + segLen
    }
  }
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * data:image/png;base64,.... → 原始字节。
 * 手写 base64 解码，不依赖 atob/Buffer，保证 node 单测与浏览器行为一致。
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex < 0) throw new Error('签名数据无效：缺少 data URL 分隔符')
  const header = dataUrl.slice(0, commaIndex)
  if (!/;base64$/i.test(header)) throw new Error('签名数据无效：仅支持 base64 编码')
  const text = dataUrl.slice(commaIndex + 1).replace(/\s+/g, '')
  if (text.length === 0 || text.length % 4 !== 0) {
    throw new Error('签名数据无效：base64 长度错误')
  }
  let padding = 0
  if (text.endsWith('==')) padding = 2
  else if (text.endsWith('=')) padding = 1
  const out = new Uint8Array((text.length / 4) * 3 - padding)
  let o = 0
  for (let i = 0; i < text.length; i += 4) {
    const a = B64_ALPHABET.indexOf(text[i])
    const b = B64_ALPHABET.indexOf(text[i + 1])
    const c = text[i + 2] === '=' ? 0 : B64_ALPHABET.indexOf(text[i + 2])
    const d = text[i + 3] === '=' ? 0 : B64_ALPHABET.indexOf(text[i + 3])
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      throw new Error('签名图片无效：base64 含非法字符')
    }
    const n = (a << 18) | (b << 12) | (c << 6) | d
    out[o++] = (n >> 16) & 0xff
    if (text[i + 2] !== '=') out[o++] = (n >> 8) & 0xff
    if (text[i + 3] !== '=') out[o++] = n & 0xff
  }
  return out
}

/** 解析 1 起的页码为 0 起索引；非法或越界抛错 */
export function parsePageIndex(raw: string, pageCount: number): number {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) throw new Error(`页码无效：${raw}`)
  const n = Number(t)
  if (n < 1 || n > pageCount) throw new Error(`页码超出范围：${raw}（共 ${pageCount} 页）`)
  return n - 1
}

/** 解析滑杆数值（整数或小数）；空串/非数字/越界抛错 */
export function parseSliderValue(raw: string, label: string, min: number, max: number): number {
  const t = raw.trim()
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) throw new Error(`${label}无效：${raw}`)
  const v = Number(t)
  if (v < min || v > max) throw new Error(`${label}超出范围：${raw}（${min}–${max}）`)
  return v
}

/**
 * 客户端坐标 → 画布内部分辨率坐标（按 getBoundingClientRect 等比映射，
 * 并钳制到画布范围内）。rect 宽高异常（jsdom 下为 0）时返回原点，
 * 调用方无异常分支。
 */
export function toCanvasPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  if (!(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0 }
  const x = ((clientX - rect.left) / rect.width) * canvasW
  const y = ((clientY - rect.top) / rect.height) * canvasH
  return {
    x: Math.min(Math.max(x, 0), canvasW),
    y: Math.min(Math.max(y, 0), canvasH),
  }
}

/** 签名在 PDF 页面上的落点（PDF 坐标系：左下角为原点，单位为点） */
export interface SignatureRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 计算签名落点：
 * - 签名原始宽高（像素按 1px=1pt 计）× scalePct/100 得到目标尺寸；
 * - 目标尺寸超出页面时等比收缩到页面内；
 * - xPct/yPct 为签名左上角在「页面可移动范围」内的百分比
 *   （0=贴左/上边缘，100=贴右/下边缘），签名恒不溢出页面。
 */
export function computeSignatureRect(
  pageW: number,
  pageH: number,
  sigW: number,
  sigH: number,
  xPct: number,
  yPct: number,
  scalePct: number,
): SignatureRect {
  const dims: Array<[string, number]> = [
    ['页面宽度', pageW],
    ['页面高度', pageH],
    ['签名宽度', sigW],
    ['签名高度', sigH],
  ]
  for (const [name, v] of dims) {
    if (!Number.isFinite(v) || v <= 0) throw new Error(`签名落点计算失败：${name}无效`)
  }
  if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) {
    throw new Error('签名位置超出范围（0–100）')
  }
  if (scalePct <= 0) throw new Error('签名缩放无效')
  const k = scalePct / 100
  let width = sigW * k
  let height = sigH * k
  if (width > pageW || height > pageH) {
    const fit = Math.min(pageW / width, pageH / height)
    width *= fit
    height *= fit
  }
  const x = ((pageW - width) * xPct) / 100
  const top = ((pageH - height) * yPct) / 100
  // PDF 坐标系原点在左下角：y 从“距顶距离”换算
  return { x, y: pageH - top - height, width, height }
}

/** 构造输出文件名：原名 + -signed.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'signed'
  return `${base}-signed.pdf`
}

/** PDF 页面信息：载入文档并读取每页尺寸；加密/损坏时抛错，由调用方转译 */
export async function getPdfInfo(
  bytes: Uint8Array,
): Promise<{ pageCount: number; pages: Array<{ width: number; height: number }> }> {
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages().map((p) => {
    const { width, height } = p.getSize()
    return { width, height }
  })
  return { pageCount: pages.length, pages }
}

/** 待嵌入的签名图片（kind 决定 embedPng/embedJpg 分发） */
export interface SignatureEmbedInput {
  kind: SignatureImageKind
  data: Uint8Array
}

// 查表分发代替 if/else：两种图片嵌入路径均为直线代码，无分支
const imageEmbedders = {
  png: (doc: PDFDocument, data: Uint8Array) => doc.embedPng(data),
  jpg: (doc: PDFDocument, data: Uint8Array) => doc.embedJpg(data),
}

/**
 * 将签名图片嵌入 PDF 指定页面的给定矩形。
 * 仅做可视化绘制（drawImage），不写任何数字签名字典，
 * 输出 PDF 不含密码学签名结构。
 */
export async function embedSignature(
  pdfBytes: Uint8Array,
  sig: SignatureEmbedInput,
  pageIndex: number,
  rect: SignatureRect,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes)
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= doc.getPageCount()) {
    throw new Error(`页码超出范围：第 ${pageIndex + 1} 页（共 ${doc.getPageCount()} 页）`)
  }
  const image = await imageEmbedders[sig.kind](doc, sig.data)
  doc.getPage(pageIndex).drawImage(image, {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  })
  const saved = await doc.save()
  // 拷贝为确定性的 ArrayBuffer 视图，调用方可直接作 BlobPart
  return new Uint8Array(saved)
}
