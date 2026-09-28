/**
 * base64-to-image 纯函数：Base64 输入解析、atob 解码、魔数 MIME 推断、参数校验与文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 输入文本长度上限 70MB 字符（Base64 膨胀约 4/3，对应约 50MB 解码后图片） */
export const MAX_INPUT_CHARS = 70 * 1024 * 1024

export const DEFAULT_QUALITY = 80

export type OutputFormat = 'png' | 'jpeg'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验输入文本长度；超限抛错 */
export function assertInputSizeOk(length: number): void {
  if (length > MAX_INPUT_CHARS) {
    throw new Error(`输入文本过长：上限 ${MAX_INPUT_CHARS / 1024 / 1024}MB 字符`)
  }
}

/** 去除全部空白字符（换行/空格/制表符）：粘贴的 Base64 常带换行，先规范化再校验 */
export function normalizeBase64Input(input: string): string {
  return input.replace(/\s+/g, '')
}

/** Base64 合法性校验：正则 + 长度 % 4；空串视为非法 */
export function isValidBase64(input: string): boolean {
  if (input.length === 0) return false
  if (input.length % 4 !== 0) return false
  return /^[A-Za-z0-9+/]*={0,2}$/.test(input)
}

export interface ParsedBase64 {
  /** DataURL 声明的 MIME；纯 base64 输入时为 null（由魔数推断） */
  mime: string | null
  /** 规范化后的纯 base64 数据段 */
  data: string
}

const DATA_URL_PATTERN = /^data:([^;,]*)(?:;[^,]*)?,([\s\S]*)$/i

/**
 * 解析 Base64 输入：
 * - 完整 DataURL：解析声明 MIME 与数据段；非 image/* 抛错；空数据段/非法 Base64 抛错
 * - 纯 base64：校验合法性，非法字符或长度异常抛错
 * - 空输入（含仅空白）抛错；超长输入抛错
 */
export function parseBase64Input(raw: string): ParsedBase64 {
  const trimmed = raw.trim()
  if (trimmed === '') throw new Error('输入不能为空：请粘贴 Base64 文本或完整 DataURL')
  assertInputSizeOk(trimmed.length)
  const m = DATA_URL_PATTERN.exec(trimmed)
  if (m) {
    const mime = m[1].trim() || null
    if (mime !== null && !mime.toLowerCase().startsWith('image/')) {
      throw new Error(`不支持的 DataURL 类型：${mime}（仅支持图片）`)
    }
    const data = normalizeBase64Input(m[2])
    if (!isValidBase64(data)) throw new Error('DataURL 数据段不是合法的 Base64')
    return { mime, data }
  }
  const data = normalizeBase64Input(trimmed)
  if (!isValidBase64(data)) throw new Error('输入不是合法的 Base64：存在非法字符或长度不正确')
  return { mime: null, data }
}

/**
 * atob 逐字符解码为 Uint8Array。
 * 返回 Uint8Array<ArrayBuffer>（变量类型注解，非 new 上的显式泛型），
 * 使其可直接作为 BlobPart 使用。
 */
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  let bin: string
  try {
    bin = atob(b64)
  } catch {
    throw new Error('Base64 解码失败：输入包含非法字符')
  }
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}

/**
 * 魔数推断 MIME：PNG / JPEG / GIF / WebP / BMP。
 * 用于纯 base64 输入（无声明 MIME）；无法识别时默认 'image/png'。
 */
export function sniffMimeFromBytes(bytes: Uint8Array): string {
  const h = (i: number): number => (i < bytes.length ? bytes[i] : -1)
  // PNG: 89 50 4E 47
  if (h(0) === 0x89 && h(1) === 0x50 && h(2) === 0x4e && h(3) === 0x47) return 'image/png'
  // JPEG: FF D8 FF
  if (h(0) === 0xff && h(1) === 0xd8 && h(2) === 0xff) return 'image/jpeg'
  // GIF: 47 49 46 38 ("GIF8")
  if (h(0) === 0x47 && h(1) === 0x49 && h(2) === 0x46 && h(3) === 0x38) return 'image/gif'
  // WebP: RIFF .... WEBP
  if (
    h(0) === 0x52 &&
    h(1) === 0x49 &&
    h(2) === 0x46 &&
    h(3) === 0x46 &&
    h(8) === 0x57 &&
    h(9) === 0x45 &&
    h(10) === 0x42 &&
    h(11) === 0x50
  )
    return 'image/webp'
  // BMP: 42 4D ("BM")
  if (h(0) === 0x42 && h(1) === 0x4d) return 'image/bmp'
  return 'image/png'
}

/** 解析质量 1–100；空串用默认 80 */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
}

/** 选项 format 转 MIME */
export function formatToMime(format: OutputFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png'
}

/** PNG 为无损，质量参数不生效，返回 undefined 让调用方感知 */
export function effectiveQuality(format: OutputFormat, quality: number): number | undefined {
  if (format === 'png') return undefined
  return quality / 100
}

/** 解码下载文件名：按输出格式定扩展名 */
export function buildOutputFileName(format: OutputFormat): string {
  return `base64-image.${format === 'jpeg' ? 'jpg' : 'png'}`
}
