/**
 * keccak256（#694）工具函数：
 * Keccak-256 独立哈希工具 —— 文本（UTF-8）或 hex 输入 → hex / base64 输出。
 * 实现与 #691 address-validate 同构（Keccak padding 0x01…0x80，区别于 SHA3-256）。
 * 全部纯函数，便于单测。
 */

const MASK64 = (1n << 64n) - 1n

/** Keccak-f[1600] 的 24 轮轮常数（与 #691 一致） */
const RC: readonly bigint[] = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]

/** rho 旋转偏移，扁平下标 i = x + 5y（FIPS 202 表 2） */
const ROT: readonly number[] = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
]

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
 * Keccak-256 摘要：速率 136 字节（200 − 2×32）；
 * Keccak padding：首填充字节 0x01（非 SHA3 的 0x06），末字节按位或 0x80。
 */
export function keccak256(bytes: Uint8Array): Uint8Array {
  const rate = 136
  const state = new Array<bigint>(25).fill(0n)

  const padLength = rate - (bytes.length % rate)
  const padded = new Uint8Array(bytes.length + padLength)
  padded.set(bytes)
  padded[bytes.length] = 0x01
  padded[bytes.length + padLength - 1] |= 0x80

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate; i += 1) {
      const lane = i >> 3
      state[lane] ^= BigInt(padded[offset + i]) << BigInt((i & 7) * 8)
    }
    keccakF(state)
  }

  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i += 1) {
    out[i] = Number((state[i >> 3] >> BigInt((i & 7) * 8)) & 0xffn)
  }
  return out
}

/** 字节数组转小写 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 字节数组转 base64 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export type HashInputKind = 'text' | 'hex'
export type HashOutputFormat = 'hex' | 'base64'

/** 解析输入：text 按 UTF-8 编码；hex 须为偶数位 hex（可带 0x） */
export function parseHashInput(text: string, kind: HashInputKind): Uint8Array {
  if (kind === 'text') return new TextEncoder().encode(text)
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('hex 输入不能为空')
  const m = /^(0[xX])?([0-9a-fA-F]*)$/.exec(trimmed)
  if (!m || m[2].length === 0 || m[2].length % 2 !== 0) {
    throw new Error('hex 格式错误：须为偶数位十六进制字符（可带 0x 前缀）')
  }
  const hex = m[2].toLowerCase()
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** 一站式：输入文本 + 输入类型 + 输出格式 → 摘要字符串 */
export function hashKeccak256(
  text: string,
  kind: HashInputKind,
  format: HashOutputFormat,
): string {
  const digest = keccak256(parseHashInput(text, kind))
  return format === 'hex' ? bytesToHex(digest) : bytesToBase64(digest)
}
