/**
 * image-info 纯函数：文件头魔数识别、宽高比/百万像素文本、声明类型推断、大小格式化。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 魔数识别出的图片格式 */
export type DetectedFormat =
  'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'avif' | 'ico' | 'svg' | 'unknown'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 传给 detectImageFormat 的文件头字节数（Tool 层只读文件前 512 字节） */
export const HEADER_BYTES = 512

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

/** 字节串是否以给定签名开头（自动处理截断输入） */
function startsWith(bytes: Uint8Array, offset: number, sig: readonly number[]): boolean {
  if (bytes.length < offset + sig.length) return false
  for (let i = 0; i < sig.length; i++) {
    if (bytes[offset + i] !== sig[i]) return false
  }
  return true
}

/** 读取指定偏移处的 ASCII 文本（截断输入自动缩短） */
function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  let s = ''
  for (let i = 0; i < length && offset + i < bytes.length; i++) {
    s += String.fromCharCode(bytes[offset + i])
  }
  return s
}

/** AVIF：ISO BMFF 容器，box 头 'ftyp' 之后的主品牌或兼容品牌中含 'avif' */
function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  if (asciiAt(bytes, 4, 4) !== 'ftyp') return false
  // 主品牌（偏移 8）+ 兼容品牌（其后最多 7 个 4 字节槽）
  for (let offset = 8; offset + 4 <= bytes.length && offset < 8 + 4 * 8; offset += 4) {
    if (asciiAt(bytes, offset, 4) === 'avif') return true
  }
  return false
}

/** SVG：文本格式，取前 200 字节，去 BOM/前导空白后以 <svg 或 <?xml 开头 */
function isSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 200))
  const text = head.replace(/^\uFEFF/, '').trimStart()
  return text.startsWith('<svg') || text.startsWith('<?xml')
}

/**
 * 按文件头魔数识别图片实际格式。
 * 注意：只看字节内容，不看扩展名/MIME，因此能发现"改名伪装"的文件。
 */
export function detectImageFormat(bytes: Uint8Array): DetectedFormat {
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47])) return 'png'
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (asciiAt(bytes, 0, 4) === 'GIF8') return 'gif'
  if (asciiAt(bytes, 0, 2) === 'BM') return 'bmp'
  if (asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 4) === 'WEBP') return 'webp'
  if (isAvif(bytes)) return 'avif'
  if (startsWith(bytes, 0, [0x00, 0x00, 0x01, 0x00])) return 'ico'
  if (isSvg(bytes)) return 'svg'
  return 'unknown'
}

/** 识别结果的展示名 */
export function formatLabel(format: DetectedFormat): string {
  switch (format) {
    case 'png':
      return 'PNG'
    case 'jpeg':
      return 'JPEG'
    case 'webp':
      return 'WebP'
    case 'gif':
      return 'GIF'
    case 'bmp':
      return 'BMP'
    case 'avif':
      return 'AVIF'
    case 'ico':
      return 'ICO'
    case 'svg':
      return 'SVG'
    case 'unknown':
      return '未知'
  }
}

/** 最大公约数（辗转相除） */
function gcd(a: number, b: number): number {
  let x = a
  let y = b
  while (y !== 0) {
    const r = x % y
    x = y
    y = r
  }
  return x
}

/** 宽高比文本：用 gcd 化简，如 1920×1080 → "16:9"；宽高非法抛错 */
export function aspectRatioText(w: number, h: number): string {
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w <= 0 ||
    h <= 0
  ) {
    throw new Error(`尺寸无效：${w}×${h}（宽高须为正整数）`)
  }
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

/** 百万像素文本：保留 1 位小数，如 4000×3000 → "12.0 MP"；宽高非法抛错 */
export function megapixelsText(w: number, h: number): string {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error(`尺寸无效：${w}×${h}（宽高须为正数）`)
  }
  return `${((w * h) / 1_000_000).toFixed(1)} MP`
}

/** 人性化文件大小（lib.formatBytes 的纯函数复刻，保持 utils 零依赖） */
export function formatBytesText(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const v = bytes / 1024 ** i
  return `${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 1 : 2)} ${units[i]}`
}

/** 格式名归一化：jpeg→jpg、svg+xml→svg、x-icon→ico，便于声明/实际比对 */
function normalizeFormatName(name: string): string {
  const n = name.toLowerCase()
  if (n === 'jpeg') return 'jpg'
  if (n === 'svg+xml') return 'svg'
  if (n === 'x-icon' || n === 'vnd.microsoft.icon') return 'ico'
  return n
}

/**
 * 推断文件的声明类型：优先用 MIME（如 image/png → png），无 MIME 时用扩展名。
 * 返回归一化后的小写格式名（如 'png'、'jpg'），无法推断返回空串。
 */
export function guessDeclaredType(fileName: string, mime: string): string {
  const m = /^image\/([a-z0-9.+-]+)$/i.exec(mime.trim())
  if (m) return normalizeFormatName(m[1])
  const ext = /\.([a-z0-9]+)$/i.exec(fileName.trim())
  if (ext) return normalizeFormatName(ext[1])
  return ''
}

/**
 * 声明类型与魔数识别的实际格式是否不一致。
 * 实际格式为 unknown 或声明类型为空时无法判定，不算不一致。
 */
export function isFormatMismatch(declared: string, detected: DetectedFormat): boolean {
  if (detected === 'unknown') return false
  if (declared === '') return false
  return normalizeFormatName(declared) !== normalizeFormatName(detected)
}
