import { WORDLIST } from './wordlist'

/**
 * mnemonic（#702）工具函数：
 * BIP39 助记词——生成 / 校验 / 转种子。
 * SHA-256 / SHA-512 / HMAC-SHA-512 / PBKDF2 全部手写（同步、可单测），
 * 密码学正确性由官方 BIP39 测试向量与 Node crypto 独立交叉验证。
 */

/* ---------------- SHA-256（手写，FIPS 180-4） ---------------- */

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

/** SHA-256，返回 32 字节 */
export function sha256Bytes(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8
  const padLen = (56 - (data.length + 1) % 64 + 64) % 64
  const msg = new Uint8Array(data.length + 1 + padLen + 8)
  msg.set(data)
  msg[data.length] = 0x80
  const dv = new DataView(msg.buffer)
  // 64 位长度：高 32 位恒为 0（输入远小于 2^32 字节），低 32 位写入
  dv.setUint32(msg.length - 4, bitLen >>> 0)
  dv.setUint32(msg.length - 8, Math.floor(bitLen / 0x100000000))

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19
  const w = new Array<number>(64)

  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = dv.getUint32(off + i * 4)
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr32(w[i - 15], 7) ^ rotr32(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr32(w[i - 2], 17) ^ rotr32(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + s1 + ch + SHA256_K[i] + w[i]) | 0
      const s0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (s0 + maj) | 0
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0
  }

  const out = new Uint8Array(32)
  const odv = new DataView(out.buffer)
  odv.setUint32(0, h0); odv.setUint32(4, h1); odv.setUint32(8, h2); odv.setUint32(12, h3)
  odv.setUint32(16, h4); odv.setUint32(20, h5); odv.setUint32(24, h6); odv.setUint32(28, h7)
  return out
}

/* ---------------- SHA-512（手写，FIPS 180-4，BigInt 版） ---------------- */

const SHA512_K: readonly bigint[] = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
]

const MASK64 = (1n << 64n) - 1n

function rotr64(x: bigint, n: bigint): bigint {
  return ((x >> n) | (x << (64n - n))) & MASK64
}

/** SHA-512，返回 64 字节 */
export function sha512Bytes(data: Uint8Array): Uint8Array {
  const bitLenLo = (data.length * 8) >>> 0
  const bitLenHi = Math.floor((data.length * 8) / 0x100000000)
  const padLen = (112 - ((data.length + 1) % 128) + 128) % 128
  const msg = new Uint8Array(data.length + 1 + padLen + 16)
  msg.set(data)
  msg[data.length] = 0x80
  const dv = new DataView(msg.buffer)
  dv.setUint32(msg.length - 4, bitLenLo)
  dv.setUint32(msg.length - 8, 0)
  dv.setUint32(msg.length - 12, bitLenHi)
  dv.setUint32(msg.length - 16, 0)

  let h0 = 0x6a09e667f3bcc908n, h1 = 0xbb67ae8584caa73bn
  let h2 = 0x3c6ef372fe94f82bn, h3 = 0xa54ff53a5f1d36f1n
  let h4 = 0x510e527fade682d1n, h5 = 0x9b05688c2b3e6c1fn
  let h6 = 0x1f83d9abfb41bd6bn, h7 = 0x5be0cd19137e2179n
  const w = new Array<bigint>(80)

  for (let off = 0; off < msg.length; off += 128) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = (BigInt(dv.getUint32(off + i * 8)) << 32n) | BigInt(dv.getUint32(off + i * 8 + 4))
    }
    for (let i = 16; i < 80; i += 1) {
      const s0 = rotr64(w[i - 15], 1n) ^ rotr64(w[i - 15], 8n) ^ (w[i - 15] >> 7n)
      const s1 = rotr64(w[i - 2], 19n) ^ rotr64(w[i - 2], 61n) ^ (w[i - 2] >> 6n)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & MASK64
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
    for (let i = 0; i < 80; i += 1) {
      const s1 = rotr64(e, 14n) ^ rotr64(e, 18n) ^ rotr64(e, 41n)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + s1 + ch + SHA512_K[i] + w[i]) & MASK64
      const s0 = rotr64(a, 28n) ^ rotr64(a, 34n) ^ rotr64(a, 39n)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (s0 + maj) & MASK64
      h = g; g = f; f = e; e = (d + t1) & MASK64; d = c; c = b; b = a; a = (t1 + t2) & MASK64
    }
    h0 = (h0 + a) & MASK64; h1 = (h1 + b) & MASK64
    h2 = (h2 + c) & MASK64; h3 = (h3 + d) & MASK64
    h4 = (h4 + e) & MASK64; h5 = (h5 + f) & MASK64
    h6 = (h6 + g) & MASK64; h7 = (h7 + h) & MASK64
  }

  const out = new Uint8Array(64)
  const odv = new DataView(out.buffer)
  const hs = [h0, h1, h2, h3, h4, h5, h6, h7]
  for (let i = 0; i < 8; i += 1) {
    odv.setUint32(i * 8, Number(hs[i] >> 32n))
    odv.setUint32(i * 8 + 4, Number(hs[i] & 0xffffffffn))
  }
  return out
}

/* ---------------- HMAC-SHA-512 / PBKDF2 ---------------- */

/** HMAC-SHA-512 */
export function hmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array {
  let k = key
  if (k.length > 128) k = sha512Bytes(k)
  const padded = new Uint8Array(128)
  padded.set(k)
  const ipad = new Uint8Array(128)
  const opad = new Uint8Array(128)
  for (let i = 0; i < 128; i += 1) {
    ipad[i] = padded[i] ^ 0x36
    opad[i] = padded[i] ^ 0x5c
  }
  const inner = new Uint8Array(128 + data.length)
  inner.set(ipad)
  inner.set(data, 128)
  const innerHash = sha512Bytes(inner)
  const outer = new Uint8Array(128 + 64)
  outer.set(opad)
  outer.set(innerHash, 128)
  return sha512Bytes(outer)
}

/**
 * PBKDF2-HMAC-SHA-512（手写，同步）。
 * password/salt 为字节，iterations 迭代次数，dkLen 派生长度（字节）。
 */
export function pbkdf2HmacSha512(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  dkLen: number,
): Uint8Array {
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error('迭代次数须为正整数')
  if (!Number.isInteger(dkLen) || dkLen < 1) throw new Error('派生长度须为正整数')
  const hLen = 64
  const blocks = Math.ceil(dkLen / hLen)
  const out = new Uint8Array(blocks * hLen)
  const saltBlock = new Uint8Array(salt.length + 4)
  saltBlock.set(salt)
  const sv = new DataView(saltBlock.buffer)
  for (let i = 1; i <= blocks; i += 1) {
    sv.setUint32(salt.length, i)
    let u = hmacSha512(password, saltBlock)
    const t = u.slice()
    for (let j = 1; j < iterations; j += 1) {
      u = hmacSha512(password, u)
      for (let k = 0; k < hLen; k += 1) t[k] ^= u[k]
    }
    out.set(t, (i - 1) * hLen)
  }
  return out.slice(0, dkLen)
}

/* ---------------- BIP39 ---------------- */

export const WORD_COUNTS = [12, 15, 18, 21, 24] as const

/** 默认随机源：WebCrypto */
export function defaultRandomSource(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

function bytesToBinary(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join('')
}

/**
 * 熵 → 助记词。entropy 长度须为 16/20/24/28/32 字节（对应 12/15/18/21/24 词）。
 */
export function entropyToMnemonic(entropy: Uint8Array): string {
  const entBits = entropy.length * 8
  if (![128, 160, 192, 224, 256].includes(entBits)) {
    throw new Error('熵长度错误：须为 128/160/192/224/256 位（16/20/24/28/32 字节）')
  }
  const checksumBits = entBits / 32
  const hashBits = bytesToBinary(sha256Bytes(entropy)).slice(0, checksumBits)
  const bits = bytesToBinary(entropy) + hashBits
  const words: string[] = []
  for (let i = 0; i < bits.length; i += 11) {
    words.push(WORDLIST[parseInt(bits.slice(i, i + 11), 2)])
  }
  return words.join(' ')
}

/** 生成助记词：wordCount 词数（12/15/18/21/24），randomSource 可注入 */
export function generateMnemonic(
  wordCount: number,
  randomSource: (n: number) => Uint8Array = defaultRandomSource,
): string {
  if (!WORD_COUNTS.includes(wordCount as (typeof WORD_COUNTS)[number])) {
    throw new Error('词数错误：须为 12/15/18/21/24')
  }
  const entBytes = (wordCount * 11 - (wordCount * 11) / 33) / 8
  return entropyToMnemonic(randomSource(entBytes))
}

/** 助记词 → 熵（字节）：校验词库成员与 checksum，非法抛中文错 */
export function mnemonicToEntropy(mnemonic: string): Uint8Array {
  const words = mnemonic.trim().split(/\s+/)
  if (!WORD_COUNTS.includes(words.length as (typeof WORD_COUNTS)[number])) {
    throw new Error(`词数错误：须为 12/15/18/21/24，当前 ${words.length} 词`)
  }
  const indexOf = new Map<string, number>(WORDLIST.map((w, i) => [w, i]))
  const bitsArr: string[] = []
  for (const w of words) {
    const idx = indexOf.get(w.toLowerCase())
    if (idx === undefined) throw new Error(`词库中没有这个词：${w}`)
    bitsArr.push(idx.toString(2).padStart(11, '0'))
  }
  const bits = bitsArr.join('')
  const checksumBits = Math.floor(bits.length / 33)
  const entBits = bits.length - checksumBits
  const entropy = new Uint8Array(entBits / 8)
  for (let i = 0; i < entropy.length; i += 1) {
    entropy[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  }
  const expected = bytesToBinary(sha256Bytes(entropy)).slice(0, checksumBits)
  if (bits.slice(entBits) !== expected) throw new Error('校验失败：助记词 checksum 不正确')
  return entropy
}

/**
 * 助记词 → 种子（BIP39：PBKDF2-HMAC-SHA512，2048 轮，salt="mnemonic"+passphrase，64 字节）。
 * pbkdf2 可注入（默认手写实现），测试可用 Node crypto 交叉验证。
 */
export function mnemonicToSeed(
  mnemonic: string,
  passphrase = '',
  pbkdf2: typeof pbkdf2HmacSha512 = pbkdf2HmacSha512,
): Uint8Array {
  // 先校验助记词合法
  mnemonicToEntropy(mnemonic)
  const normalized = mnemonic.trim().split(/\s+/).join(' ')
  const password = new TextEncoder().encode(normalized)
  const salt = new TextEncoder().encode(`mnemonic${passphrase}`)
  return pbkdf2(password, salt, 2048, 64)
}

/** 字节数组转小写 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
