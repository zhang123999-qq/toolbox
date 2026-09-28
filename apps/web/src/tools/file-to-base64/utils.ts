import type { FileToBase64Input, FileToBase64Options } from './schema'

/** 单个文件上限：200 MiB */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 文本上限，与 schema 保持一致 */
const MAX_TEXT_LENGTH = 5_000_000

/** btoa 分块大小：一次展开太多参数会栈溢出 */
const CHUNK = 0x8000

/** 字节 → Base64（分块经 latin1 字符串走 btoa） */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** 组装 DataURL */
export function toDataUrl(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`
}

/** 文件的 MIME：取 File.type，空则回退 octet-stream */
export function mimeOf(file: Pick<File, 'type'>): string {
  return file.type === '' ? 'application/octet-stream' : file.type
}

/** 文本模式：按 UTF-8 编码后转 Base64 */
export function encodeText(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

/** 编码报告的说明行 */
export function formatHeader(kind: 'text' | 'file', name: string, size: number): string {
  return kind === 'text' ? `文本：${size} 字符` : `文件：${name}（${size} 字节）`
}

/**
 * 文件入口：读字节 → 转 Base64 → 可选拼 DataURL。
 * 输出带说明行 + 空行 + 编码正文，便于复制。
 */
export async function encodeFile(file: File, options: FileToBase64Options): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${file.size} 字节，超过 ${MAX_FILE_BYTES} 字节上限`)
  }
  const buffer = await file.arrayBuffer()
  const base64 = bytesToBase64(new Uint8Array(buffer))
  const body = options.dataUrl ? toDataUrl(mimeOf(file), base64) : base64
  return `${formatHeader('file', file.name, file.size)}\n\n${body}`
}

/** T2 文本模式：空输入返回空串，超长报错 */
export function transform(input: FileToBase64Input, options: FileToBase64Options): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_TEXT_LENGTH) {
    throw new Error('文本超过 500 万字符上限')
  }
  const base64 = encodeText(input.text)
  const body = options.dataUrl ? toDataUrl('text/plain;charset=utf-8', base64) : base64
  return `${formatHeader('text', '', input.text.length)}\n\n${body}`
}
