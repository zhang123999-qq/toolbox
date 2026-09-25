import type { AesInput, AesOptions } from './schema'

/** GCM 推荐 96 位 IV；CBC 的 IV 必须等于分组长度 16 字节 */
const GCM_IV_BYTES = 12
const CBC_IV_BYTES = 16
const MAX_LENGTH = 200000

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 可选值（与 schema、Tool.tsx 保持一致） */
export const METHODS = ['GCM', 'CBC'] as const
export const BITS = ['128', '192', '256'] as const
export const ENCODINGS = ['utf8', 'hex', 'base64'] as const

/** 字节数据的类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

/** 取随机字节：显式用 ArrayBuffer 承载，避免 SharedArrayBuffer 的类型分歧 */
function randomBytes(length: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)))
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

/** base64 转字节；非法输入给出可读报错（忽略空白与换行） */
export function fromBase64(text: string): Bytes {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned === '') throw new Error('base64 内容为空')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) throw new Error('不是合法的 base64')
  const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
}

/** 按编码把「密钥 / IV 输入框」里的字符串解析成字节 */
export function parseBytes(text: string, encoding: string): Bytes {
  if (encoding === 'hex') return fromHex(text)
  if (encoding === 'base64') return fromBase64(text)
  return new TextEncoder().encode(text)
}

/** bits 选项对应的密钥字节数 */
export function expectedKeyBytes(bits: string): number {
  return Number(bits) / 8
}

/** 该方法要求的 IV 字节数 */
export function ivBytesFor(method: string): number {
  return method === 'CBC' ? CBC_IV_BYTES : GCM_IV_BYTES
}

/** 组装 WebCrypto 的算法参数 */
function paramsFor(method: string, iv: Bytes): AesGcmParams | AesCbcParams {
  return method === 'CBC' ? { name: 'AES-CBC', iv } : { name: 'AES-GCM', iv }
}

/** 导入 AES 密钥（raw → CryptoKey） */
async function importAesKey(
  keyBytes: Bytes,
  method: string,
  usage: 'encrypt' | 'decrypt',
): Promise<CryptoKey> {
  return webcrypto().importKey('raw', keyBytes, { name: `AES-${method}` }, false, [usage])
}

/** 字节级加密：返回原始密文字节（GCM 的认证标签由 WebCrypto 附在密文尾部） */
export async function encryptBytes(
  plain: Bytes,
  keyBytes: Bytes,
  method: string,
  iv: Bytes,
): Promise<Bytes> {
  const key = await importAesKey(keyBytes, method, 'encrypt')
  const buffer = await webcrypto().encrypt(paramsFor(method, iv), key, plain)
  return new Uint8Array(buffer)
}

/** 字节级解密：输入原始密文字节，返回明文字节 */
export async function decryptBytes(
  cipherBytes: Bytes,
  keyBytes: Bytes,
  method: string,
  iv: Bytes,
): Promise<Bytes> {
  const key = await importAesKey(keyBytes, method, 'decrypt')
  const buffer = await webcrypto().decrypt(paramsFor(method, iv), key, cipherBytes)
  return new Uint8Array(buffer)
}

/** 校验密钥长度：不匹配直接报错，不静默补齐或截断 */
function assertKeyBytes(keyBytes: Uint8Array, bits: string): void {
  const want = expectedKeyBytes(bits)
  if (keyBytes.length !== want) {
    throw new Error(`AES-${bits} 需要 ${want} 字节密钥，当前是 ${keyBytes.length} 字节`)
  }
}

/** 加密时的 IV：填了就按填的用（校验长度），没填时 GCM 自动随机、CBC 直接报错 */
function resolveIv(inputIv: string, options: AesOptions): Bytes {
  const want = ivBytesFor(options.method)
  if (inputIv === '') {
    if (options.method === 'CBC') {
      throw new Error('CBC 模式需要填写 16 字节 IV（GCM 可留空，会自动生成随机 IV）')
    }
    return randomBytes(GCM_IV_BYTES)
  }
  const iv = parseBytes(inputIv, options.encoding)
  if (iv.length !== want) throw new Error(`IV 需要 ${want} 字节，当前是 ${iv.length} 字节`)
  return iv
}

/** 解析输出格式 `<iv(base64)>.<密文(base64)>` */
function unpack(text: string, options: AesOptions): { iv: Bytes; cipherBytes: Bytes } {
  const parts = text.trim().split('.')
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
    throw new Error('密文格式应为 `<iv(base64)>.<密文(base64)>`（两段均为 base64）')
  }
  const iv = fromBase64(parts[0])
  const want = ivBytesFor(options.method)
  if (iv.length !== want) throw new Error(`IV 长度应为 ${want} 字节，当前是 ${iv.length} 字节`)
  return { iv, cipherBytes: fromBase64(parts[1]) }
}

/**
 * AES 加密 / 解密。
 * 输出统一为 `<iv(base64)>.<密文(base64)>`：
 * - GCM：WebCrypto 把 16 字节认证标签附在密文尾部，因此整段密文自带完整性校验
 * - CBC：使用 PKCS#7 填充，**不提供完整性校验**，密文被改动时无法察觉
 */
export async function transform(input: AesInput, options: AesOptions): Promise<string> {
  if (input.text === '') return ''
  if (input.text.length > MAX_LENGTH) throw new Error('输入超过 200,000 字符上限')
  if (input.key === '') throw new Error('请先填写密钥')

  const keyBytes = parseBytes(input.key, options.encoding)
  assertKeyBytes(keyBytes, options.bits)

  if (options.direction === 'encrypt') {
    const iv = resolveIv(input.iv, options)
    const cipherBytes = await encryptBytes(
      new TextEncoder().encode(input.text),
      keyBytes,
      options.method,
      iv,
    )
    return `${toBase64(iv)}.${toBase64(cipherBytes)}`
  }

  const { iv, cipherBytes } = unpack(input.text, options)
  let plainBytes: Bytes
  try {
    plainBytes = await decryptBytes(cipherBytes, keyBytes, options.method, iv)
  } catch {
    throw new Error('解密失败：密钥 / IV 不对，或密文已被篡改（GCM 会校验完整性）')
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(plainBytes)
  } catch {
    throw new Error('解密结果不是合法的 UTF-8 文本：密钥或 IV 可能不对')
  }
}
