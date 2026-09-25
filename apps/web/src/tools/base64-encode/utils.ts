import type { Base64Input, Base64Options } from './schema'

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 字节 → 二进制字符串（btoa 只接受 latin1 字符） */
function bytesToBinaryString(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return out
}

/** 二进制字符串 → 字节 */
function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** UTF-8 文本 → Base64（urlsafe 变体替换 +/ 并去掉 = 填充） */
export function encodeBase64(text: string, urlsafe: boolean): string {
  const base64 = btoa(bytesToBinaryString(new TextEncoder().encode(text)))
  if (!urlsafe) return base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Base64 → UTF-8 文本。
 * 宽容处理常见的「非标准输入」：忽略空白与换行（证书、邮件体里很常见）、
 * 自动补齐被省略的 `=` 填充、把 URL-safe 的 `-_` 还原回 `+/`。
 */
export function decodeBase64(text: string): string {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned === '') return ''
  const normalized = cleaned.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  const binary = atob(normalized + '='.repeat(padding))
  return new TextDecoder('utf-8', { fatal: true }).decode(binaryStringToBytes(binary))
}

export function transform(input: Base64Input, options: Base64Options): string {
  if (input.text === '') return ''
  try {
    if (options.direction === 'decode') return decodeBase64(input.text)
    return encodeBase64(input.text, options.mode === 'urlsafe')
  } catch {
    throw new Error('解码失败：输入不是合法的 Base64，或解码结果不是合法的 UTF-8 文本')
  }
}
