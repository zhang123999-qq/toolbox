/**
 * pdf-to-image-extract 纯函数：文件校验（魔数/大小）、operatorList 解析、
 * pdfjs 图片对象归一化为 RGBA、文件名构造。
 * 不触碰 DOM/Canvas；pdfjs-dist 为纯 JS（仅取 OPS / ImageKind 常量），可 100% 单测。
 */
import { ImageKind, OPS } from 'pdfjs-dist'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 单个 PDF 最多提取的图片数（内存与结果卡片数量的安全边界，README 有说明） */
export const MAX_IMAGES = 200
/** 单张图片单边像素上限（主流浏览器 Canvas 安全边界，与 #462 一致） */
export const MAX_IMAGE_DIMENSION = 16384

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

/** 校验单张图片尺寸合法且不超过 Canvas 像素上限（超限由调用方计为跳过） */
export function assertImageSizeOk(width: number, height: number): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION
  ) {
    throw new Error(`图片尺寸无效或超限：${String(width)}×${String(height)}`)
  }
}

/**
 * 是否为 pdfjs 抛出的加密 PDF 错误。
 * pdfjs 在需要密码时以 PasswordException（name 固定）拒绝 getDocument().promise，
 * message 如 "No password given" / "Incorrect Password"。
 */
export function isEncryptedPdfError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'PasswordException' || /password/i.test(err.message))
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'png' | 'jpeg'): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png'
}

/** 构造单张输出文件名：原名-p{页码}-img{序号}.扩展名（空名兜底为 pdf） */
export function buildImageFileName(
  fileName: string,
  pageNum: number,
  index: number,
  format: 'png' | 'jpeg',
): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '') || 'pdf'
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  return `${base}-p${pageNum}-img${index}.${ext}`
}

/** pdfjs 图片对象（page.objs.get / 内联图片 args 的形态） */
export interface PdfImageDataLike {
  width: number
  height: number
  kind?: number
  data: Uint8Array | Uint8ClampedArray
}

/** 宽松判定：是否为可尝试归一化的图片对象 */
export function isImageDataLike(value: unknown): value is PdfImageDataLike {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { width?: unknown; height?: unknown; data?: unknown }
  if (typeof v.width !== 'number' || !Number.isFinite(v.width) || v.width <= 0) return false
  if (typeof v.height !== 'number' || !Number.isFinite(v.height) || v.height <= 0) return false
  if (typeof v.data !== 'object' || v.data === null) return false
  const len = (v.data as { length?: unknown }).length
  return typeof len === 'number' && len > 0
}

/** page.getOperatorList() 返回的形态（只取用到的两个数组） */
export interface OperatorListLike {
  fnArray: number[]
  argsArray: unknown[][]
}

/** 命名图片引用：args[0] 为 page.objs 中的对象名（如 "img_12"） */
export interface NamedImageRef {
  kind: 'named'
  name: string
}
/** 内联图片：args[0] 直接就是图片对象 */
export interface InlineImageRef {
  kind: 'inline'
  image: PdfImageDataLike
}
export type ImageRef = NamedImageRef | InlineImageRef

/**
 * 从 operatorList 收集图片引用（按出现顺序）：
 *  - OPS.paintImageXObject：args[0] 为对象名，需再经 page.objs.get(name) 取数据；
 *  - OPS.paintInlineImageXObject：args[0] 直接为图片对象。
 * 蒙版类操作（op 83，args[0] 为 {data: 对象名} 的包装对象，非字符串）会被
 * typeof 守卫滤掉——1-bit 遮罩不是可提取的照片，不计入。
 */
export function collectImageRefs(opList: OperatorListLike): ImageRef[] {
  const refs: ImageRef[] = []
  const { fnArray, argsArray } = opList
  const total = Math.min(fnArray.length, argsArray.length)
  for (let i = 0; i < total; i++) {
    const fn = fnArray[i]
    const args = argsArray[i]
    if (!Array.isArray(args) || args.length === 0) continue
    if (fn === OPS.paintImageXObject) {
      const name = args[0]
      if (typeof name === 'string' && name !== '') refs.push({ kind: 'named', name })
    } else if (fn === OPS.paintInlineImageXObject) {
      const image = args[0]
      if (isImageDataLike(image)) refs.push({ kind: 'inline', image })
    }
  }
  return refs
}

/** 归一化后的图片数据：RGBA，可直接 set 进 Canvas ImageData */
export interface NormalizedImage {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

function assertValidDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`图片尺寸无效：${String(width)}×${String(height)}`)
  }
}

/**
 * 把 pdfjs 图片对象归一化为 RGBA。
 * pdfjs 的 createImageData 只产出三种 kind：
 *  - RGBA_32BPP：4 字节/像素，直接拷贝；
 *  - RGB_24BPP：3 字节/像素，补 alpha=255；
 *  - GRAYSCALE_1BPP：1 bit/像素（MSB 在前），bit=1 为白、0 为黑，alpha=255。
 * kind 缺失时按 data 长度回退判定；都对不上则抛错（调用方计为跳过）。
 */
export function normalizeToRgba(image: PdfImageDataLike): NormalizedImage {
  const { width, height, kind, data } = image
  assertValidDimensions(width, height)
  const bytes = data
  const pixelCount = width * height
  const len = bytes.length
  if (kind === ImageKind.RGBA_32BPP || len === pixelCount * 4) {
    if (len < pixelCount * 4) throw new Error('图片数据长度不足（RGBA）')
    return { width, height, rgba: new Uint8ClampedArray(bytes.subarray(0, pixelCount * 4)) }
  }
  if (kind === ImageKind.RGB_24BPP || len === pixelCount * 3) {
    if (len < pixelCount * 3) throw new Error('图片数据长度不足（RGB）')
    const rgba = new Uint8ClampedArray(pixelCount * 4)
    for (let i = 0; i < pixelCount; i++) {
      const s = i * 3
      const d = i * 4
      rgba[d] = bytes[s]
      rgba[d + 1] = bytes[s + 1]
      rgba[d + 2] = bytes[s + 2]
      rgba[d + 3] = 255
    }
    return { width, height, rgba }
  }
  if (kind === ImageKind.GRAYSCALE_1BPP) {
    const stride = Math.ceil(width / 8)
    if (len < stride * height) throw new Error('图片数据长度不足（1BPP）')
    const rgba = new Uint8ClampedArray(pixelCount * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byte = bytes[y * stride + (x >> 3)]
        const v = ((byte >> (7 - (x & 7))) & 1) === 1 ? 255 : 0
        const d = (y * width + x) * 4
        rgba[d] = v
        rgba[d + 1] = v
        rgba[d + 2] = v
        rgba[d + 3] = 255
      }
    }
    return { width, height, rgba }
  }
  throw new Error(`不支持的图片数据格式（kind=${String(kind)}，长度=${len}）`)
}
