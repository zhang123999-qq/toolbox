import type { TextHashInput, TextHashOptions } from './schema'

/** 支持的算法；WebCrypto 只提供 SHA 家族，MD5 不在其中 */
export const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

/** 字节转十六进制 */
export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 计算摘要：输入输出都是 UTF-8 */
export async function digest(text: string, algorithm: string, uppercase: boolean): Promise<string> {
  const subtle = webcrypto()
  const data = new TextEncoder().encode(text)
  const bytes = new Uint8Array(await subtle.digest(algorithm, data))
  const hex = toHex(bytes)
  return uppercase ? hex.toUpperCase() : hex
}

/** 计算哈希 */
export async function transform(input: TextHashInput, options: TextHashOptions): Promise<string> {
  if (input.text === '') return ''
  return digest(input.text, options.algorithm, options.uppercase)
}
