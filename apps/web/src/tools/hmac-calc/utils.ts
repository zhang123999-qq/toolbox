import type { HmacInput, HmacOptions } from './schema'

/** 支持的哈希算法；WebCrypto 的 HMAC 全部原生支持 */
export const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const

/** 支持的输出格式 */
export const FORMATS = ['hex', 'base64'] as const

/** 密钥的两种写法：普通文本 / 十六进制字节串 */
export const KEY_TYPES = ['text', 'hex'] as const

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

/** 十六进制字符串 → 字节。忽略空白、大小写不敏感；非法输入直接报错而不是静默截断 */
export function hexToBytes(text: string): Uint8Array<ArrayBuffer> {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned.length === 0) return new Uint8Array(0)
  if (cleaned.length % 2 !== 0) throw new Error('十六进制密钥的位数必须为偶数')
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) throw new Error('十六进制密钥只能包含 0-9 与 a-f')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** 把密钥字段按 type 解析成字节：文本走 UTF-8，十六进制走字节串 */
export function keyBytes(key: string, type: (typeof KEY_TYPES)[number]): Uint8Array<ArrayBuffer> {
  return type === 'hex' ? hexToBytes(key) : new TextEncoder().encode(key)
}

/** 计算 HMAC：key 为原始字节，message 按 UTF-8 编码 */
export async function sign(
  message: string,
  key: Uint8Array<ArrayBuffer>,
  algorithm: (typeof ALGORITHMS)[number],
  format: (typeof FORMATS)[number],
): Promise<string> {
  const subtle = webcrypto()
  const cryptoKey = await subtle.importKey('raw', key, { name: 'HMAC', hash: algorithm }, false, [
    'sign',
  ])
  const mac = new Uint8Array(
    await subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)),
  )
  return format === 'base64' ? toBase64(mac) : toHex(mac)
}

/** 计算 HMAC */
export async function transform(input: HmacInput, options: HmacOptions): Promise<string> {
  if (input.text === '') return ''
  if (input.key === '') throw new Error('请先填写密钥')
  return sign(input.text, keyBytes(input.key, options.type), options.algorithm, options.format)
}
