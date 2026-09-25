import type { Blake2Input, Blake2Options } from './schema'

/**
 * BLAKE2（RFC 7693）纯 JS 实现。
 *
 * ⚠️ WebCrypto **不包含** BLAKE2（`subtle.digest` 的算法集合里没有它，规范也没有），
 * 因此这里没有原生分支，全部走内置实现：
 *   - BLAKE2b：64 位字，块 128 字节，12 轮；用 BigInt 做 64 位加法与旋转；
 *   - BLAKE2s：32 位字，块 64 字节，10 轮；用 `>>> 0` 保持无符号 32 位。
 * 参数块取 `0x01010000 ^ (keyLength << 8) ^ digestLength`（本工具不启用密钥，
 * 故 keyLength = 0）；已用 RFC 7693 的 "abc" 向量与空串向量逐位验证。
 */

/** 支持的算法（变体名 = 家族 + 输出位宽） */
export const ALGORITHMS = [
  'BLAKE2b-512',
  'BLAKE2b-384',
  'BLAKE2b-256',
  'BLAKE2s-256',
  'BLAKE2s-128',
] as const

/** 每个变体对应的家族与输出字节数 */
export const VARIANTS: Record<
  (typeof ALGORITHMS)[number],
  { family: 'b' | 's'; outBytes: number }
> = {
  'BLAKE2b-512': { family: 'b', outBytes: 64 },
  'BLAKE2b-384': { family: 'b', outBytes: 48 },
  'BLAKE2b-256': { family: 'b', outBytes: 32 },
  'BLAKE2s-256': { family: 's', outBytes: 32 },
  'BLAKE2s-128': { family: 's', outBytes: 16 },
}

/** 支持的输出格式 */
export const FORMATS = ['hex', 'base64'] as const

/** 消息调度表（RFC 7693 §2.7）：BLAKE2b 用前 12 行（第 10/11 轮复用第 0/1 行），BLAKE2s 用前 10 行 */
const SIGMA: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
]

/** BLAKE2b 初始向量（SHA-512 前 64 位） */
const IV64: readonly bigint[] = [
  0x6a09e667f3bcc908n,
  0xbb67ae8584caa73bn,
  0x3c6ef372fe94f82bn,
  0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n,
  0x9b05688c2b3e6c1fn,
  0x1f83d9abfb41bd6bn,
  0x5be0cd19137e2179n,
]

/** BLAKE2s 初始向量（SHA-256 前 32 位） */
const IV32: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]

/** BLAKE2b 块大小（字节） */
const BLOCK_B = 128

/** BLAKE2s 块大小（字节） */
const BLOCK_S = 64

/** Base64 字母表 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const MASK64 = (1n << 64n) - 1n

/** 64 位循环右移 */
function rotr64(value: bigint, shift: number): bigint {
  const s = BigInt(shift)
  return ((value >> s) | (value << (64n - s))) & MASK64
}

/** 32 位循环右移 */
function rotr32(value: number, shift: number): number {
  return ((value >>> shift) | (value << (32 - shift))) >>> 0
}

/** BLAKE2b 单块压缩函数 */
function compressB(h: bigint[], block: Uint8Array, t: bigint, last: boolean): void {
  const v = new Array<bigint>(16)
  for (let i = 0; i < 8; i += 1) v[i] = h[i]
  for (let i = 0; i < 8; i += 1) v[8 + i] = IV64[i]
  v[12] ^= t & MASK64
  v[13] ^= (t >> 64n) & MASK64
  if (last) v[14] ^= MASK64

  const m = new Array<bigint>(16)
  for (let i = 0; i < 16; i += 1) {
    let word = 0n
    for (let j = 0; j < 8; j += 1) word |= BigInt(block[i * 8 + j]) << BigInt(8 * j)
    m[i] = word
  }

  const g = (a: number, b: number, c: number, d: number, x: bigint, y: bigint): void => {
    v[a] = (v[a] + v[b] + x) & MASK64
    v[d] = rotr64(v[d] ^ v[a], 32)
    v[c] = (v[c] + v[d]) & MASK64
    v[b] = rotr64(v[b] ^ v[c], 24)
    v[a] = (v[a] + v[b] + y) & MASK64
    v[d] = rotr64(v[d] ^ v[a], 16)
    v[c] = (v[c] + v[d]) & MASK64
    v[b] = rotr64(v[b] ^ v[c], 63)
  }

  for (let round = 0; round < 12; round += 1) {
    const s = SIGMA[round % 10]
    g(0, 4, 8, 12, m[s[0]], m[s[1]])
    g(1, 5, 9, 13, m[s[2]], m[s[3]])
    g(2, 6, 10, 14, m[s[4]], m[s[5]])
    g(3, 7, 11, 15, m[s[6]], m[s[7]])
    g(0, 5, 10, 15, m[s[8]], m[s[9]])
    g(1, 6, 11, 12, m[s[10]], m[s[11]])
    g(2, 7, 8, 13, m[s[12]], m[s[13]])
    g(3, 4, 9, 14, m[s[14]], m[s[15]])
  }

  for (let i = 0; i < 8; i += 1) h[i] = (h[i] ^ v[i] ^ v[i + 8]) & MASK64
}

/** BLAKE2s 单块压缩函数 */
function compressS(h: number[], block: Uint8Array, t: number, last: boolean): void {
  const v = new Array<number>(16)
  for (let i = 0; i < 8; i += 1) v[i] = h[i]
  for (let i = 0; i < 8; i += 1) v[8 + i] = IV32[i]
  v[12] = (v[12] ^ (t >>> 0)) >>> 0
  v[13] = (v[13] ^ Math.floor(t / 0x100000000)) >>> 0
  if (last) v[14] = (v[14] ^ 0xffffffff) >>> 0

  const m = new Array<number>(16)
  for (let i = 0; i < 16; i += 1) {
    m[i] =
      (block[i * 4] |
        (block[i * 4 + 1] << 8) |
        (block[i * 4 + 2] << 16) |
        (block[i * 4 + 3] << 24)) >>>
      0
  }

  const g = (a: number, b: number, c: number, d: number, x: number, y: number): void => {
    v[a] = (v[a] + v[b] + x) >>> 0
    v[d] = rotr32(v[d] ^ v[a], 16)
    v[c] = (v[c] + v[d]) >>> 0
    v[b] = rotr32(v[b] ^ v[c], 12)
    v[a] = (v[a] + v[b] + y) >>> 0
    v[d] = rotr32(v[d] ^ v[a], 8)
    v[c] = (v[c] + v[d]) >>> 0
    v[b] = rotr32(v[b] ^ v[c], 7)
  }

  for (let round = 0; round < 10; round += 1) {
    const s = SIGMA[round]
    g(0, 4, 8, 12, m[s[0]], m[s[1]])
    g(1, 5, 9, 13, m[s[2]], m[s[3]])
    g(2, 6, 10, 14, m[s[4]], m[s[5]])
    g(3, 7, 11, 15, m[s[6]], m[s[7]])
    g(0, 5, 10, 15, m[s[8]], m[s[9]])
    g(1, 6, 11, 12, m[s[10]], m[s[11]])
    g(2, 7, 8, 13, m[s[12]], m[s[13]])
    g(3, 4, 9, 14, m[s[14]], m[s[15]])
  }

  for (let i = 0; i < 8; i += 1) h[i] = (h[i] ^ v[i] ^ v[i + 8]) >>> 0
}

/** BLAKE2b 摘要（outBytes ∈ 1..64） */
export function blake2b(message: Uint8Array, outBytes: number): Uint8Array {
  const h = IV64.slice()
  h[0] ^= 0x01010000n ^ BigInt(outBytes)

  let t = 0n
  let offset = 0
  // 除最后一块外的整块都按「非最终块」压缩
  while (message.length - offset > BLOCK_B) {
    t += BigInt(BLOCK_B)
    compressB(h, message.subarray(offset, offset + BLOCK_B), t, false)
    offset += BLOCK_B
  }
  // 末块补零到整块后按「最终块」压缩（消息为空串时也走这里）
  const last = new Uint8Array(BLOCK_B)
  const remain = message.length - offset
  last.set(message.subarray(offset))
  t += BigInt(remain)
  compressB(h, last, t, true)

  const out = new Uint8Array(outBytes)
  for (let i = 0; i < outBytes; i += 1) {
    out[i] = Number((h[i >> 3] >> BigInt(8 * (i & 7))) & 0xffn)
  }
  return out
}

/** BLAKE2s 摘要（outBytes ∈ 1..32） */
export function blake2s(message: Uint8Array, outBytes: number): Uint8Array {
  const h = IV32.slice()
  h[0] = (h[0] ^ (0x01010000 ^ outBytes)) >>> 0

  let t = 0
  let offset = 0
  while (message.length - offset > BLOCK_S) {
    t += BLOCK_S
    compressS(h, message.subarray(offset, offset + BLOCK_S), t, false)
    offset += BLOCK_S
  }
  const last = new Uint8Array(BLOCK_S)
  const remain = message.length - offset
  last.set(message.subarray(offset))
  t += remain
  compressS(h, last, t, true)

  const out = new Uint8Array(outBytes)
  for (let i = 0; i < outBytes; i += 1) {
    out[i] = (h[i >> 2] >>> (8 * (i & 3))) & 0xff
  }
  return out
}

/** 按变体名计算摘要 */
export function hash(message: Uint8Array, algorithm: (typeof ALGORITHMS)[number]): Uint8Array {
  const variant = VARIANTS[algorithm]
  return variant.family === 'b'
    ? blake2b(message, variant.outBytes)
    : blake2s(message, variant.outBytes)
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

/** 计算 BLAKE2 摘要：输入按 UTF-8 编码，输出为 hex 或 Base64 */
export async function digest(
  text: string,
  algorithm: (typeof ALGORITHMS)[number],
  format: (typeof FORMATS)[number],
): Promise<string> {
  const bytes = hash(new TextEncoder().encode(text), algorithm)
  return format === 'base64' ? toBase64(bytes) : toHex(bytes)
}

/** 计算 BLAKE2 哈希 */
export async function transform(input: Blake2Input, options: Blake2Options): Promise<string> {
  if (input.text === '') return ''
  return digest(input.text, options.algorithm, options.format)
}
