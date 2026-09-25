// crypto-js 不随包提供类型声明，仓库也没有安装 @types/crypto-js。
// 受「每个工具恰好 8 个文件、不得外新增 d.ts」的约束，只能在此处就地抑制该导入的类型报错。
// @ts-expect-error crypto-js 无类型声明（未安装 @types/crypto-js）
import CryptoJS from 'crypto-js'
import type { DesInput, DesOptions } from './schema'

/** DES / 3DES 的块大小（字节） */
const BLOCK_BYTES = 8
/** DES 密钥 8 字节（56 位有效位 + 8 位校验位）；3DES 为 3 个 DES 密钥 → 24 字节 */
const DES_KEY_BYTES = 8
const TRIPLE_DES_KEY_BYTES = 24
const MAX_LENGTH = 200000

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 算法 / 模式 / 密钥编码 / 填充方式的可选值（与 schema、Tool.tsx 保持一致） */
export const METHODS = ['des', '3des'] as const
export const MODES = ['CBC', 'ECB'] as const
export const ENCODINGS = ['utf8', 'hex', 'base64'] as const
export const PADDINGS = ['pkcs7', 'zero', 'none'] as const

/** 字节转十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 十六进制转字节 */
export function fromHex(text: string): Uint8Array {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned.length % 2 !== 0) throw new Error('十六进制长度必须是偶数')
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) throw new Error('不是合法的十六进制字符串')
  const bytes = new Uint8Array(cleaned.length / 2)
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
export function fromBase64(text: string): Uint8Array {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned === '') return new Uint8Array(0)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) throw new Error('不是合法的 base64')
  const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
}

/** 按编码把「密钥 / IV 输入框」里的字符串解析成字节 */
export function parseBytes(text: string, encoding: string): Uint8Array {
  if (encoding === 'hex') return fromHex(text)
  if (encoding === 'base64') return fromBase64(text)
  return new TextEncoder().encode(text)
}

/** 该方法要求的密钥字节数 */
export function expectedKeyLength(method: string): number {
  return method === '3des' ? TRIPLE_DES_KEY_BYTES : DES_KEY_BYTES
}

/** 字节 → CryptoJS WordArray */
function bytesToWordArray(bytes: Uint8Array): unknown {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >>> 2] = (words[i >>> 2] ?? 0) | (bytes[i] << (24 - (i % 4) * 8))
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

/** CryptoJS WordArray → 字节 */
function wordArrayToBytes(wordArray: CryptoJsWordArray): Uint8Array {
  const out = new Uint8Array(wordArray.sigBytes)
  for (let i = 0; i < wordArray.sigBytes; i += 1) {
    out[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return out
}

/** CryptoJS 的块密码（DES / TripleDES）在此用到的形状 */
interface CryptoJsWordArray {
  readonly words: number[]
  readonly sigBytes: number
}
interface CryptoJsCipher {
  encrypt(
    message: unknown,
    key: unknown,
    cfg: Record<string, unknown>,
  ): { readonly ciphertext: CryptoJsWordArray }
  decrypt(ciphertext: unknown, key: unknown, cfg: Record<string, unknown>): CryptoJsWordArray
}

function cipherOf(method: string): CryptoJsCipher {
  const cipher = method === '3des' ? CryptoJS.TripleDES : CryptoJS.DES
  return cipher as CryptoJsCipher
}

function modeOf(mode: string): unknown {
  return mode === 'ECB' ? CryptoJS.mode.ECB : CryptoJS.mode.CBC
}

function paddingOf(padding: string): unknown {
  if (padding === 'none') return CryptoJS.pad.NoPadding
  if (padding === 'zero') return CryptoJS.pad.ZeroPadding
  return CryptoJS.pad.Pkcs7
}

/** 组装加解密配置；CBC 必须带 iv */
function configFor(
  mode: string,
  padding: string,
  ivBytes: Uint8Array | null,
): Record<string, unknown> {
  const config: Record<string, unknown> = { mode: modeOf(mode), padding: paddingOf(padding) }
  if (mode === 'CBC') {
    if (!ivBytes) throw new Error('CBC 模式需要 8 字节 IV')
    config.iv = bytesToWordArray(ivBytes)
  }
  return config
}

/** 密钥长度校验：不匹配就直接报错，不静默补齐或截断 */
export function assertKeyLength(keyBytes: Uint8Array, method: string): void {
  const want = expectedKeyLength(method)
  if (keyBytes.length !== want) {
    const name = method === '3des' ? '3DES' : 'DES'
    throw new Error(`${name} 需要 ${want} 字节密钥，当前是 ${keyBytes.length} 字节`)
  }
}

/** 字节级加密：返回原始密文字节（不含 IV） */
export function encryptBytes(
  plain: Uint8Array,
  keyBytes: Uint8Array,
  ivBytes: Uint8Array | null,
  options: Pick<DesOptions, 'method' | 'mode' | 'padding'>,
): Uint8Array {
  assertKeyLength(keyBytes, options.method)
  const result = cipherOf(options.method).encrypt(
    bytesToWordArray(plain),
    bytesToWordArray(keyBytes),
    configFor(options.mode, options.padding, ivBytes),
  )
  return wordArrayToBytes(result.ciphertext)
}

/** 字节级解密：输入原始密文字节（不含 IV），返回明文字节 */
export function decryptBytes(
  cipherBytes: Uint8Array,
  keyBytes: Uint8Array,
  ivBytes: Uint8Array | null,
  options: Pick<DesOptions, 'method' | 'mode' | 'padding'>,
): Uint8Array {
  assertKeyLength(keyBytes, options.method)
  if (options.mode === 'CBC' && cipherBytes.length % BLOCK_BYTES !== 0) {
    throw new Error('CBC 密文长度必须是 8 字节的整数倍')
  }
  const result = cipherOf(options.method).decrypt(
    { ciphertext: bytesToWordArray(cipherBytes) },
    bytesToWordArray(keyBytes),
    configFor(options.mode, options.padding, ivBytes),
  )
  return wordArrayToBytes(result)
}

/** 解析加密时使用的 IV：CBC 必填且必须是 8 字节 */
function resolveIv(ivText: string, encoding: string): Uint8Array {
  if (ivText === '') throw new Error('CBC 模式需要填写 8 字节 IV')
  const ivBytes = parseBytes(ivText, encoding)
  if (ivBytes.length !== BLOCK_BYTES) {
    throw new Error(`IV 需要 8 字节，当前是 ${ivBytes.length} 字节`)
  }
  return ivBytes
}

/** 输出格式：CBC 为 `<iv(base64)>.<密文(base64)>`，ECB 只有密文 */
function pack(ivBytes: Uint8Array | null, cipherBytes: Uint8Array): string {
  const body = toBase64(cipherBytes)
  return ivBytes ? `${toBase64(ivBytes)}.${body}` : body
}

/** 解析输出格式，拆出 IV 与密文 */
function unpack(
  text: string,
  options: DesOptions,
): { ivBytes: Uint8Array | null; cipherBytes: Uint8Array } {
  if (options.mode === 'ECB') return { ivBytes: null, cipherBytes: fromBase64(text) }
  const parts = text.trim().split('.')
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
    throw new Error('CBC 密文格式应为 `<iv>.<密文>`（两段均为 base64）')
  }
  const ivBytes = fromBase64(parts[0])
  if (ivBytes.length !== BLOCK_BYTES) throw new Error('IV 长度不是 8 字节')
  return { ivBytes, cipherBytes: fromBase64(parts[1]) }
}

/**
 * DES / 3DES 加密解密。
 * ⚠️ DES 的 56 位密钥早已可被暴力破解，3DES 也已弃用；本工具只为兼容遗留系统而存在。
 */
export function transform(input: DesInput, options: DesOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_LENGTH) throw new Error('输入超过 200,000 字符上限')
  if (input.key === '') throw new Error('请先填写密钥')

  const keyBytes = parseBytes(input.key, options.encoding)
  assertKeyLength(keyBytes, options.method)

  if (options.direction === 'encrypt') {
    const ivBytes = options.mode === 'CBC' ? resolveIv(input.iv, options.encoding) : null
    const cipherBytes = encryptBytes(
      new TextEncoder().encode(input.text),
      keyBytes,
      ivBytes,
      options,
    )
    return pack(ivBytes, cipherBytes)
  }

  const { ivBytes, cipherBytes } = unpack(input.text, options)
  let plainBytes: Uint8Array
  try {
    plainBytes = decryptBytes(cipherBytes, keyBytes, ivBytes, options)
  } catch {
    throw new Error('解密失败：密钥 / IV / 模式 / 填充方式不匹配，或密文不是合法 base64')
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(plainBytes)
  } catch {
    throw new Error('解密结果不是合法的 UTF-8 文本：密钥或 IV 可能不对')
  }
}
