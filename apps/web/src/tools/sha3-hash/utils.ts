import type { Sha3Input, Sha3Options } from './schema'

/**
 * SHA-3（FIPS 202）实现。
 *
 * ⚠️ WebCrypto 对 SHA-3 的支持并不完整：规范里已把 SHA3-* 加进 `subtle.digest`
 * 的算法集合，但并非所有浏览器都真正实现（例如 Node 22 的 WebCrypto 就只支持
 * SHA-1 / SHA-2）。因此策略是：
 *   1. 先尝试浏览器原生 `crypto.subtle.digest('SHA3-256' | ...)`；
 *   2. 一旦抛错（算法不被识别 / 环境没有 subtle），回落到下面这份纯 JS 的
 *      Keccak-f[1600] + 海绵结构实现（FIPS 202，域分隔 0x06，pad10*1 填充）。
 * 两条路径对本工具支持的全部输入产生完全一致的输出。
 */

/** 支持的算法名（与 WebCrypto 的算法标识一致） */
export const ALGORITHMS = ['SHA3-256', 'SHA3-384', 'SHA3-512'] as const

/** 各算法的输出字节数 */
const OUTPUT_BYTES: Record<(typeof ALGORITHMS)[number], number> = {
  'SHA3-256': 32,
  'SHA3-384': 48,
  'SHA3-512': 64,
}

/** 支持的输出格式 */
export const FORMATS = ['hex', 'base64'] as const

const MASK64 = (1n << 64n) - 1n

/** Keccak-f[1600] 的 24 轮轮常数 */
const RC: readonly bigint[] = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
]

/** rho 旋转偏移，扁平下标 i = x + 5y（FIPS 202 表 2） */
const ROT: readonly number[] = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
]

/** Base64 字母表 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 64 位循环左移 */
function rotl64(value: bigint, shift: number): bigint {
  const s = BigInt(shift)
  return ((value << s) | (value >> (64n - s))) & MASK64
}

/** Keccak-f[1600] 置换：theta → rho → pi → chi → iota */
function keccakF(a: bigint[]): void {
  const c = new Array<bigint>(5)
  const b = new Array<bigint>(25)
  for (let round = 0; round < 24; round += 1) {
    for (let x = 0; x < 5; x += 1) {
      c[x] = a[x] ^ a[x + 5] ^ a[x + 10] ^ a[x + 15] ^ a[x + 20]
    }
    for (let x = 0; x < 5; x += 1) {
      const d = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1)
      for (let y = 0; y < 5; y += 1) a[x + 5 * y] ^= d
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(a[x + 5 * y], ROT[x + 5 * y])
      }
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        const i = x + 5 * y
        a[i] = (b[i] ^ (~b[((x + 1) % 5) + 5 * y] & b[((x + 2) % 5) + 5 * y])) & MASK64
      }
    }
    a[0] ^= RC[round]
  }
}

/**
 * 纯 JS 的 SHA-3 摘要（FIPS 202）：
 * 速率 = 200 − 2 × 输出字节数；域分隔 0x06；pad10*1 填充（末字节按位或 0x80）。
 */
export function sha3Digest(bytes: Uint8Array, outBytes: number): Uint8Array {
  const rate = 200 - 2 * outBytes
  const state = new Array<bigint>(25).fill(0n)

  const padLength = rate - (bytes.length % rate)
  const padded = new Uint8Array(bytes.length + padLength)
  padded.set(bytes)
  padded[bytes.length] = 0x06
  padded[bytes.length + padLength - 1] |= 0x80

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate; i += 1) {
      const lane = i >> 3
      state[lane] ^= BigInt(padded[offset + i]) << BigInt((i & 7) * 8)
    }
    keccakF(state)
  }

  const out = new Uint8Array(outBytes)
  for (let i = 0; i < outBytes; i += 1) {
    out[i] = Number((state[i >> 3] >> BigInt((i & 7) * 8)) & 0xffn)
  }
  return out
}

/** 尝试用浏览器原生 WebCrypto 计算 SHA-3；环境不支持时抛错，由调用方回落 */
async function nativeDigest(algorithm: string, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境没有 WebCrypto')
  return new Uint8Array(await subtle.digest(algorithm, data))
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

/**
 * 计算 SHA-3 摘要：优先浏览器原生实现，不支持时自动回落到内置实现。
 * 输入按 UTF-8 编码，输出为 hex 或 Base64。
 */
export async function digest(
  text: string,
  algorithm: (typeof ALGORITHMS)[number],
  format: (typeof FORMATS)[number],
): Promise<string> {
  const data = new TextEncoder().encode(text)
  let bytes: Uint8Array
  try {
    bytes = await nativeDigest(algorithm, data)
  } catch {
    bytes = sha3Digest(data, OUTPUT_BYTES[algorithm])
  }
  return format === 'base64' ? toBase64(bytes) : toHex(bytes)
}

/** 计算 SHA-3 哈希 */
export async function transform(input: Sha3Input, options: Sha3Options): Promise<string> {
  if (input.text === '') return ''
  return digest(input.text, options.algorithm, options.format)
}
