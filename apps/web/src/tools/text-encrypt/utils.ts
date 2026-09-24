import type { TextEncryptInput, TextEncryptOptions } from './schema'

/** 口令派生参数：迭代次数越高越难暴力破解，100k 是常见的折中值 */
const ITERATIONS = 100000
const SALT_BYTES = 16
const IV_BYTES = 12

/** 字节数据的类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/** 密文容器的结构：salt、iv、密文三段拼接，统一 base64 输出 */
export interface Packet {
  readonly salt: Bytes
  readonly iv: Bytes
  readonly data: Bytes
}

/** 取随机字节：显式用 ArrayBuffer 承载，避免 SharedArrayBuffer 的类型分歧 */
function randomBytes(length: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)))
}

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

/** base64 编码 */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** base64 解码；格式不对时给出可读报错 */
export function fromBase64(text: string): Bytes {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned === '') throw new Error('密文为空')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) throw new Error('密文不是合法的 base64')
  const binary = atob(cleaned)
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
}

/** 从口令派生 AES 密钥 */
async function deriveKey(password: string, salt: Bytes): Promise<CryptoKey> {
  const subtle = webcrypto()
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 加密：返回 salt、iv、密文三段拼接后的 base64 */
export async function encrypt(text: string, password: string): Promise<string> {
  if (password === '') throw new Error('请先填写口令')
  const subtle = webcrypto()
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = await deriveKey(password, salt)
  const data = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)),
  )
  return toBase64(concat(salt, iv, data))
}

/** 解密：拆包后用同一口令还原密钥 */
export async function decrypt(packet: string, password: string): Promise<string> {
  if (password === '') throw new Error('请先填写口令')
  const subtle = webcrypto()
  const bytes = fromBase64(packet)
  if (bytes.length <= SALT_BYTES + IV_BYTES) throw new Error('密文太短，可能已被截断')
  const salt = bytes.slice(0, SALT_BYTES)
  const iv = bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const data = bytes.slice(SALT_BYTES + IV_BYTES)
  const key = await deriveKey(password, salt)
  try {
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(plain)
  } catch {
    // AES-GCM 的认证失败与「口令错误」在调用方看来没有区别，统一提示
    throw new Error('解密失败：口令不对，或密文已被改动')
  }
}

/** 拼接多段字节 */
function concat(...parts: Bytes[]): Bytes {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(new ArrayBuffer(total))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** 加密 / 解密 */
export async function transform(
  input: TextEncryptInput,
  options: TextEncryptOptions,
): Promise<string> {
  const text = input.text.trim()
  if (text === '') return ''
  return options.mode === 'encrypt' ? encrypt(text, input.password) : decrypt(text, input.password)
}
