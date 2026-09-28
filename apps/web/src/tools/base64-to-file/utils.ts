import type { Base64ToFileOptions } from './schema'

/** 输入上限：2000 万字符（约 15 MB 解码后） */
export const MAX_BASE64_CHARS = 20_000_000

/** 解码结果 */
export interface DecodedFile {
  readonly data: Uint8Array<ArrayBuffer>
  readonly filename: string
  readonly mime: string | null
}

/** 常见 MIME → 扩展名（data: URL 没写扩展名时用） */
const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/json': '.json',
  'audio/mpeg': '.mp3',
  'video/mp4': '.mp4',
}

/** 去掉 data: URL 前缀，顺带取出声明的 MIME */
export function stripDataUrlPrefix(text: string): { base64: string; mime: string | null } {
  const match = /^data:([^;,]+)?;base64,/i.exec(text.trim())
  if (!match) return { base64: text, mime: null }
  return { base64: text.trim().slice(match[0].length), mime: match[1] ?? null }
}

/** 去掉所有空白字符（Base64 文本常带换行） */
export function cleanBase64(text: string): string {
  return text.replace(/\s+/g, '')
}

/** 严格校验：字符集 + 长度是 4 的倍数 + 非空 */
export function isValidBase64(text: string): boolean {
  return text.length > 0 && text.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(text)
}

/** atob 分块解码，避免超长字符串一次展开栈溢出 */
export function decodeBase64(text: string): Uint8Array<ArrayBuffer> {
  const clean = cleanBase64(text)
  if (!isValidBase64(clean)) {
    throw new Error('不是合法的 Base64 文本：字符集错误、长度不是 4 的倍数，或内容为空')
  }
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** 扩展名归一：补前导点、去空白；空则返回空串 */
export function normalizeExtension(ext: string): string {
  const clean = ext.trim().replace(/^\.+/, '')
  return clean === '' ? '' : '.' + clean
}

/** 文件名归一：去空白与路径分隔符，空则回退 decoded */
export function normalizeFilename(name: string): string {
  const clean = name.trim().split(/[\\/]/).pop() as string
  return clean === '' ? 'decoded' : clean
}

/** 最终文件名：用户扩展名优先，其次 data: URL 的 MIME 映射，最后 .bin */
export function resolveFilename(options: Base64ToFileOptions, mime: string | null): string {
  const base = normalizeFilename(options.filename)
  const ext = normalizeExtension(options.extension)
  if (ext !== '') return base + ext
  if (mime && MIME_EXT[mime.toLowerCase()]) return base + (MIME_EXT[mime.toLowerCase()] as string)
  return base + '.bin'
}

/** data: URL 的 MIME → 下载时的 Blob 类型；未知回退 octet-stream */
export function resolveMime(mime: string | null): string {
  return mime ?? 'application/octet-stream'
}

/** 完整流程：剥前缀 → 解码 → 定文件名 */
export function decodeToFile(text: string, options: Base64ToFileOptions): DecodedFile {
  if (text.trim() === '') throw new Error('请先粘贴 Base64 文本')
  if (text.length > MAX_BASE64_CHARS) {
    throw new Error(`Base64 文本过长（${text.length} 字符），超过 ${MAX_BASE64_CHARS} 字符上限`)
  }
  const { base64, mime } = stripDataUrlPrefix(text)
  const data = decodeBase64(base64)
  return { data, filename: resolveFilename(options, mime), mime }
}

/** 解码报告（进输出区） */
export function formatReport(decoded: DecodedFile, base64Length: number): string {
  const lines = [
    `解码成功：${base64Length} 字符 → ${decoded.data.length} 字节`,
    `文件名：${decoded.filename}`,
    '',
    '点「下载」把文件保存到本地。',
  ]
  return lines.join('\n')
}

/** 下载动作的外部依赖（默认走浏览器；单测可注入假实现） */
export interface DownloadHooks {
  readonly createObjectURL: (blob: Blob) => string
  readonly revokeObjectURL: (url: string) => void
  readonly clickAnchor: (url: string, filename: string) => void
}

const browserHooks: DownloadHooks = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  clickAnchor: (url, filename) => {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  },
}

/** 触发浏览器下载 */
export function downloadBytes(
  filename: string,
  data: Uint8Array<ArrayBuffer>,
  mime = 'application/octet-stream',
  hooks: DownloadHooks = browserHooks,
): void {
  const url = hooks.createObjectURL(new Blob([data], { type: mime }))
  try {
    hooks.clickAnchor(url, filename)
  } finally {
    hooks.revokeObjectURL(url)
  }
}
