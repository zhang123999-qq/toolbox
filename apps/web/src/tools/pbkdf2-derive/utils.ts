import type { Pbkdf2Input, Pbkdf2Options } from './schema'

const MAX_LENGTH = 200000

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 可选值（与 schema、Tool.tsx 保持一致） */
export const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
export const ITERATIONS = ['1000', '10000', '100000', '600000'] as const
export const LENGTHS = ['16', '32', '64'] as const
export const ENCODINGS = ['utf8', 'hex'] as const
export const FORMATS = ['hex', 'base64'] as const

/** 字节数据的类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

/** 字节转十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 十六进制转字节 */
export function fromHex(text: string): Bytes {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned.length % 2 !== 0) throw new Error('十六进制长度必须是偶数')
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) throw new Error('不是合法的十六进制字符串')
  const bytes = new Uint8Array(new ArrayBuffer(cleaned.length / 2))
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** 字节转 base64 */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** 按编码把「盐输入框」里的字符串解析成字节 */
export function parseSalt(text: string, encoding: string): Bytes {
  if (text === '') return new Uint8Array(new ArrayBuffer(0))
  return encoding === 'hex' ? fromHex(text) : new TextEncoder().encode(text)
}

/**
 * PBKDF2 派生：返回 dkLen 字节。
 * 直接暴露字节级接口，便于用「迭代次数 = 1」之类的标准向量做断言
 * （下拉框里最小是 1000，覆盖不到 RFC 里 c=1 的向量）。
 */
export async function deriveBits(
  password: string,
  salt: Bytes,
  iterations: number,
  hash: string,
  dkLen: number,
): Promise<Bytes> {
  const subtle = webcrypto()
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash },
    material,
    dkLen * 8,
  )
  return new Uint8Array(bits)
}

/** 派生密钥并按选项编码输出 */
export async function transform(input: Pbkdf2Input, options: Pbkdf2Options): Promise<string> {
  if (input.text === '') return ''
  if (input.text.length > MAX_LENGTH) throw new Error('输入超过 200,000 字符上限')

  const salt = parseSalt(input.salt, options.encoding)
  const bytes = await deriveBits(
    input.text,
    salt,
    Number(options.iterations),
    options.algorithm,
    Number(options.length),
  )
  return options.format === 'base64' ? toBase64(bytes) : toHex(bytes)
}
