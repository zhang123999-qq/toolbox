import type { Sha1Input, Sha1Options } from './schema'

/** 支持的算法标识（WebCrypto 名称） */
export const ALGORITHM = 'SHA-1'

/** 支持的输出格式 */
export const FORMATS = ['hex', 'base64'] as const

/** Base64 字母表 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

/** 字节转十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 字节转 Base64。内置实现，不依赖 btoa，保证任意环境（含单测）结果一致 */
export function toBase64(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  for (; i + 3 <= bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out +=
      B64[b0 >> 2] +
      B64[((b0 & 0x03) << 4) | (b1 >> 4)] +
      B64[((b1 & 0x0f) << 2) | (b2 >> 6)] +
      B64[b2 & 0x3f]
  }
  const rest = bytes.length - i
  if (rest === 1) {
    const b0 = bytes[i]
    out += B64[b0 >> 2] + B64[(b0 & 0x03) << 4] + '=='
  } else if (rest === 2) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    out += B64[b0 >> 2] + B64[((b0 & 0x03) << 4) | (b1 >> 4)] + B64[(b1 & 0x0f) << 2] + '='
  }
  return out
}

/** 计算 SHA-1 摘要：输入按 UTF-8 编码，输出为 hex 或 Base64 */
export async function digest(
  text: string,
  format: (typeof FORMATS)[number],
  uppercase: boolean,
): Promise<string> {
  const subtle = webcrypto()
  const bytes = new Uint8Array(await subtle.digest(ALGORITHM, new TextEncoder().encode(text)))
  if (format === 'base64') return toBase64(bytes)
  const hex = toHex(bytes)
  return uppercase ? hex.toUpperCase() : hex
}

/** 计算 SHA-1 哈希 */
export async function transform(input: Sha1Input, options: Sha1Options): Promise<string> {
  if (input.text === '') return ''
  return digest(input.text, options.format, options.uppercase)
}
