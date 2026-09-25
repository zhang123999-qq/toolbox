import type { ScryptInput, ScryptOptions } from './schema'

const MAX_LENGTH = 200000

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** scrypt 的块大小参数 r 固定为 8（RFC 7914 推荐值，也是各实现的默认值） */
const R = 8

/** 内存上限：ROMix 要开 128 * r * N 字节，超过就拒绝，避免把标签页拖垮 */
const MAX_MEMORY_BYTES = 256 * 1024 * 1024

/** 可选值（与 schema、Tool.tsx 保持一致） */
export const BLOCKS = ['1024', '16384', '65536'] as const
export const PARALLELISMS = ['1', '2', '4'] as const
export const LENGTHS = ['32', '64'] as const
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

/** 字节转 base64 */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * PBKDF2-HMAC-SHA256（RFC 7914 的 scrypt 用到的两处派生）。
 * WebCrypto 没有 scrypt，但有 PBKDF2——把它作为 scrypt 的「头尾」两步。
 */
async function pbkdf2(password: Bytes, salt: Bytes, dkLen: number): Promise<Bytes> {
  const subtle = webcrypto()
  const material = await subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 1, hash: 'SHA-256' },
    material,
    dkLen * 8,
  )
  return new Uint8Array(bits)
}

/** 32 位循环左移 */
function rotl(value: number, count: number): number {
  return ((value << count) | (value >>> (32 - count))) >>> 0
}

/**
 * Salsa20/8 核心（RFC 7914 §3）：对 16 个 32 位字做 4 次双轮，再加回输入。
 * `orig` 是调用方提供的 16 字暂存区，避免热循环里反复分配。
 */
function salsa20_8(x: Uint32Array, orig: Uint32Array): void {
  orig.set(x.subarray(0, 16))
  for (let i = 0; i < 8; i += 2) {
    // 列轮
    x[4] ^= rotl(x[0] + x[12], 7)
    x[8] ^= rotl(x[4] + x[0], 9)
    x[12] ^= rotl(x[8] + x[4], 13)
    x[0] ^= rotl(x[12] + x[8], 18)
    x[9] ^= rotl(x[5] + x[1], 7)
    x[13] ^= rotl(x[9] + x[5], 9)
    x[1] ^= rotl(x[13] + x[9], 13)
    x[5] ^= rotl(x[1] + x[13], 18)
    x[14] ^= rotl(x[10] + x[6], 7)
    x[2] ^= rotl(x[14] + x[10], 9)
    x[6] ^= rotl(x[2] + x[14], 13)
    x[10] ^= rotl(x[6] + x[2], 18)
    x[3] ^= rotl(x[15] + x[11], 7)
    x[7] ^= rotl(x[3] + x[15], 9)
    x[11] ^= rotl(x[7] + x[3], 13)
    x[15] ^= rotl(x[11] + x[7], 18)
    // 行轮
    x[1] ^= rotl(x[0] + x[3], 7)
    x[2] ^= rotl(x[1] + x[0], 9)
    x[3] ^= rotl(x[2] + x[1], 13)
    x[0] ^= rotl(x[3] + x[2], 18)
    x[6] ^= rotl(x[5] + x[4], 7)
    x[7] ^= rotl(x[6] + x[5], 9)
    x[4] ^= rotl(x[7] + x[6], 13)
    x[5] ^= rotl(x[4] + x[7], 18)
    x[11] ^= rotl(x[10] + x[9], 7)
    x[8] ^= rotl(x[11] + x[10], 9)
    x[9] ^= rotl(x[8] + x[11], 13)
    x[10] ^= rotl(x[9] + x[8], 18)
    x[12] ^= rotl(x[15] + x[14], 7)
    x[13] ^= rotl(x[12] + x[15], 9)
    x[14] ^= rotl(x[13] + x[12], 13)
    x[15] ^= rotl(x[14] + x[13], 18)
  }
  for (let i = 0; i < 16; i += 1) x[i] = (x[i] + orig[i]) >>> 0
}

/**
 * BlockMix（RFC 7914 §4）：把 2r 个 64 字节块按 Salsa20/8 串联，
 * 输出再做「偶数块在前、奇数块在后」的重排。允许 out === b。
 */
function blockMix(
  b: Uint32Array,
  out: Uint32Array,
  r: number,
  x: Uint32Array,
  y: Uint32Array,
  orig: Uint32Array,
): void {
  const blocks = 2 * r
  x.set(b.subarray((blocks - 1) * 16, blocks * 16))
  for (let i = 0; i < blocks; i += 1) {
    const base = i * 16
    for (let j = 0; j < 16; j += 1) x[j] ^= b[base + j]
    salsa20_8(x, orig)
    y.set(x, base)
  }
  for (let i = 0; i < r; i += 1) {
    const src = i * 32
    const dst = i * 16
    for (let j = 0; j < 16; j += 1) out[dst + j] = y[src + j]
  }
  for (let i = 0; i < r; i += 1) {
    const src = i * 32 + 16
    const dst = (r + i) * 16
    for (let j = 0; j < 16; j += 1) out[dst + j] = y[src + j]
  }
}

/** ROMix（RFC 7914 §4）：先用 BlockMix 填满 V，再按 Integerify 随机回读并混合；原地改 b */
function romix(
  b: Uint32Array,
  n: number,
  r: number,
  v: Uint32Array,
  x: Uint32Array,
  y: Uint32Array,
  orig: Uint32Array,
): void {
  const words = 32 * r
  for (let i = 0; i < n; i += 1) {
    v.set(b, i * words)
    blockMix(b, b, r, x, y, orig)
  }
  for (let i = 0; i < n; i += 1) {
    // Integerify = 最后一个 64 字节块的第一个 32 位字（小端）；N 是 2 的幂，按位与即取模
    const j = b[(2 * r - 1) * 16] & (n - 1)
    const base = j * words
    for (let k = 0; k < words; k += 1) b[k] ^= v[base + k]
    blockMix(b, b, r, x, y, orig)
  }
}

/** 字节（小端）→ 32 位字 */
function bytesToWordsLE(bytes: Uint8Array, offset: number, count: number): Uint32Array {
  const out = new Uint32Array(count)
  for (let i = 0; i < count; i += 1) {
    const o = offset + i * 4
    out[i] = (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
  }
  return out
}

/** 32 位字 → 字节（小端） */
function wordsToBytesLE(words: Uint32Array, bytes: Uint8Array, offset: number): void {
  for (let i = 0; i < words.length; i += 1) {
    const value = words[i]
    const o = offset + i * 4
    bytes[o] = value & 0xff
    bytes[o + 1] = (value >>> 8) & 0xff
    bytes[o + 2] = (value >>> 16) & 0xff
    bytes[o + 3] = (value >>> 24) & 0xff
  }
}

/**
 * scrypt（RFC 7914）：
 *   B = PBKDF2-HMAC-SHA256(P, S, 1, p * 128 * r)
 *   对每个 p 分块做 ROMix
 *   return PBKDF2-HMAC-SHA256(P, B, 1, dkLen)
 *
 * ⚠️ WebCrypto 没有 scrypt（只有 PBKDF2 / HKDF），所以中间的 ROMix 是这里自己实现的。
 * 直接暴露完整参数的接口，便于用 RFC 7914 的标准向量（N=16、r=1 等）做断言。
 */
export async function scrypt(
  password: string,
  salt: string,
  N: number,
  r: number,
  p: number,
  dkLen: number,
): Promise<Uint8Array> {
  if (!Number.isInteger(N) || N < 2 || (N & (N - 1)) !== 0) {
    throw new Error(`N 必须是大于 1 的 2 的幂，当前是 ${N}`)
  }
  if (!Number.isInteger(r) || r < 1) throw new Error('r 必须是正整数')
  if (!Number.isInteger(p) || p < 1) throw new Error('p 必须是正整数')
  if (!Number.isInteger(dkLen) || dkLen < 1) throw new Error('dkLen 必须是正整数')

  const blockBytes = 128 * r
  const memory = blockBytes * N
  if (memory > MAX_MEMORY_BYTES) {
    throw new Error(`参数内存需求 ${Math.round(memory / 1048576)} MiB 超过上限，请调小 N 或 r`)
  }

  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = new TextEncoder().encode(salt)
  const b = await pbkdf2(passwordBytes, saltBytes, p * blockBytes)

  const words = 32 * r
  const v = new Uint32Array(N * words)
  const x = new Uint32Array(16)
  const y = new Uint32Array(words)
  const orig = new Uint32Array(16)

  for (let i = 0; i < p; i += 1) {
    const offset = i * blockBytes
    const block = bytesToWordsLE(b, offset, words)
    romix(block, N, r, v, x, y, orig)
    wordsToBytesLE(block, b, offset)
  }

  return pbkdf2(passwordBytes, b, dkLen)
}

/** 用固定选项（N / p / dkLen / format）派生并编码 */
export async function transform(input: ScryptInput, options: ScryptOptions): Promise<string> {
  if (input.text === '') return ''
  if (input.text.length > MAX_LENGTH) throw new Error('输入超过 200,000 字符上限')

  const bytes = await scrypt(
    input.text,
    input.salt,
    Number(options.blocks),
    R,
    Number(options.parallelism),
    Number(options.length),
  )
  return options.format === 'base64' ? toBase64(bytes) : toHex(bytes)
}
