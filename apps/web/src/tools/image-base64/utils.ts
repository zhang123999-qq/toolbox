/**
 * image-base64 纯函数：Base64 输入规范化、DataURL 解析与校验、文件名与大小工具。
 * 不触碰 React/DOM，不做 atob 解码（大文本防爆，合法性只用正则校验），可 100% 单测。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 解码时输入无 DataURL 前缀的默认 MIME */
export const DEFAULT_DECODE_MIME = 'image/png'

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

/** 由 Base64 字符数约算字节数（忽略 padding 修正，仅用于展示） */
export function base64ApproxBytes(base64Length: number): number {
  return Math.floor((base64Length * 3) / 4)
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

/** MIME 转扩展名；未知类型兜底 png */
export function mimeToExtension(mime: string): string {
  return MIME_TO_EXT[mime.toLowerCase().trim()] ?? 'png'
}

/** 解码下载文件名：按 MIME 定扩展名 */
export function buildOutputFileName(mime: string): string {
  return `base64-image.${mimeToExtension(mime)}`
}

export interface ParsedDataUrl {
  mime: string | null
  base64: string
}

const DATA_URL_PATTERN = /^data:([^;,]*)(?:;[^,]*)?,([\s\S]*)$/i

/**
 * 解析 DataURL，返回 {mime, base64}。
 * 无 data: 前缀时 mime=null、base64=原文；mime 非 image/* 时抛错。
 */
export function parseDataUrl(input: string): ParsedDataUrl {
  const m = DATA_URL_PATTERN.exec(input)
  if (!m) return { mime: null, base64: input }
  const mime = m[1].trim() || null
  if (mime !== null && !mime.toLowerCase().startsWith('image/')) {
    throw new Error(`不支持的 DataURL 类型：${mime}（仅支持图片）`)
  }
  return { mime, base64: m[2] }
}
