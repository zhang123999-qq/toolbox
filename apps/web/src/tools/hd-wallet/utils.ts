/**
 * hd-wallet（#703）工具函数：
 * BIP32 / BIP44 HD 钱包——种子 → 主密钥 → 路径推导 → 以太坊地址。
 * HMAC-SHA-512 / secp256k1 / Keccak-256 / EIP-55 全部手写（与 #693/#702 同构），
 * 密码学正确性由 BIP32 官方测试向量与独立 Python 实现交叉验证。
 * 全部纯函数，便于单测。
 */

/* ---------------- SHA-512（手写，FIPS 180-4，BigInt 版） ---------------- */

const SHA512_K: readonly bigint[] = [
  0x428a2f98d728ae22n,
  0x7137449123ef65cdn,
  0xb5c0fbcfec4d3b2fn,
  0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n,
  0x59f111f1b605d019n,
  0x923f82a4af194f9bn,
  0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n,
  0x12835b0145706fben,
  0x243185be4ee4b28cn,
  0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn,
  0x80deb1fe3b1696b1n,
  0x9bdc06a725c71235n,
  0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n,
  0xefbe4786384f25e3n,
  0x0fc19dc68b8cd5b5n,
  0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n,
  0x4a7484aa6ea6e483n,
  0x5cb0a9dcbd41fbd4n,
  0x76f988da831153b5n,
  0x983e5152ee66dfabn,
  0xa831c66d2db43210n,
  0xb00327c898fb213fn,
  0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n,
  0xd5a79147930aa725n,
  0x06ca6351e003826fn,
  0x142929670a0e6e70n,
  0x27b70a8546d22ffcn,
  0x2e1b21385c26c926n,
  0x4d2c6dfc5ac42aedn,
  0x53380d139d95b3dfn,
  0x650a73548baf63den,
  0x766a0abb3c77b2a8n,
  0x81c2c92e47edaee6n,
  0x92722c851482353bn,
  0xa2bfe8a14cf10364n,
  0xa81a664bbc423001n,
  0xc24b8b70d0f89791n,
  0xc76c51a30654be30n,
  0xd192e819d6ef5218n,
  0xd69906245565a910n,
  0xf40e35855771202an,
  0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n,
  0x1e376c085141ab53n,
  0x2748774cdf8eeb99n,
  0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n,
  0x4ed8aa4ae3418acbn,
  0x5b9cca4f7763e373n,
  0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn,
  0x78a5636f43172f60n,
  0x84c87814a1f0ab72n,
  0x8cc702081a6439ecn,
  0x90befffa23631e28n,
  0xa4506cebde82bde9n,
  0xbef9a3f7b2c67915n,
  0xc67178f2e372532bn,
  0xca273eceea26619cn,
  0xd186b8c721c0c207n,
  0xeada7dd6cde0eb1en,
  0xf57d4f7fee6ed178n,
  0x06f067aa72176fban,
  0x0a637dc5a2c898a6n,
  0x113f9804bef90daen,
  0x1b710b35131c471bn,
  0x28db77f523047d84n,
  0x32caab7b40c72493n,
  0x3c9ebe0a15c9bebcn,
  0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n,
  0x597f299cfc657e2an,
  0x5fcb6fab3ad6faecn,
  0x6c44198c4a475817n,
]

const MASK64_SHA512 = (1n << 64n) - 1n

function rotr64(x: bigint, n: bigint): bigint {
  return ((x >> n) | (x << (64n - n))) & MASK64_SHA512
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

  let h0 = 0x6a09e667f3bcc908n,
    h1 = 0xbb67ae8584caa73bn
  let h2 = 0x3c6ef372fe94f82bn,
    h3 = 0xa54ff53a5f1d36f1n
  let h4 = 0x510e527fade682d1n,
    h5 = 0x9b05688c2b3e6c1fn
  let h6 = 0x1f83d9abfb41bd6bn,
    h7 = 0x5be0cd19137e2179n
  const w = new Array<bigint>(80)

  for (let off = 0; off < msg.length; off += 128) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = (BigInt(dv.getUint32(off + i * 8)) << 32n) | BigInt(dv.getUint32(off + i * 8 + 4))
    }
    for (let i = 16; i < 80; i += 1) {
      const s0 = rotr64(w[i - 15], 1n) ^ rotr64(w[i - 15], 8n) ^ (w[i - 15] >> 7n)
      const s1 = rotr64(w[i - 2], 19n) ^ rotr64(w[i - 2], 61n) ^ (w[i - 2] >> 6n)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & MASK64_SHA512
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7
    for (let i = 0; i < 80; i += 1) {
      const s1 = rotr64(e, 14n) ^ rotr64(e, 18n) ^ rotr64(e, 41n)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + s1 + ch + SHA512_K[i] + w[i]) & MASK64_SHA512
      const s0 = rotr64(a, 28n) ^ rotr64(a, 34n) ^ rotr64(a, 39n)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (s0 + maj) & MASK64_SHA512
      h = g
      g = f
      f = e
      e = (d + t1) & MASK64_SHA512
      d = c
      c = b
      b = a
      a = (t1 + t2) & MASK64_SHA512
    }
    h0 = (h0 + a) & MASK64_SHA512
    h1 = (h1 + b) & MASK64_SHA512
    h2 = (h2 + c) & MASK64_SHA512
    h3 = (h3 + d) & MASK64_SHA512
    h4 = (h4 + e) & MASK64_SHA512
    h5 = (h5 + f) & MASK64_SHA512
    h6 = (h6 + g) & MASK64_SHA512
    h7 = (h7 + h) & MASK64_SHA512
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

/** secp256k1 素数域 p */
export const SECP256K1_P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn
/** secp256k1 阶 n */
export const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
/** 生成元 G */
export const SECP256K1_GX = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n
export const SECP256K1_GY = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n

export interface ECPoint {
  x: bigint
  y: bigint
}

/** 扩展欧几里得求模逆元；不可逆时抛错 */
export function modInv(a: bigint, m: bigint): bigint {
  let oldR = a
  let r = m
  let oldS = 1n
  let s = 0n
  while (r !== 0n) {
    const q = oldR / r
    const tmpR = oldR - q * r
    oldR = r
    r = tmpR
    const tmpS = oldS - q * s
    oldS = s
    s = tmpS
  }
  if (oldR !== 1n) throw new Error('模逆元不存在')
  return ((oldS % m) + m) % m
}

/** 点是否在 secp256k1 曲线上（y² ≡ x³ + 7 mod p） */
export function isOnCurve(p: ECPoint): boolean {
  return (p.y * p.y) % SECP256K1_P === (p.x * p.x * p.x + 7n) % SECP256K1_P
}

/**
 * 点加倍（切线法）。前置条件：p 在曲线上且 y ≠ 0；
 * secp256k1 阶为素数，kG（0 < k < n）的倍点永不出现 y = 0。
 */
export function pointDouble(p: ECPoint): ECPoint {
  const lambda = ((3n * p.x * p.x) % SECP256K1_P) * modInv((2n * p.y) % SECP256K1_P, SECP256K1_P)
  const lam = lambda % SECP256K1_P
  const x = (lam * lam - 2n * p.x) % SECP256K1_P
  const xr = (x + SECP256K1_P) % SECP256K1_P
  const y = (lam * (p.x - xr) - p.y) % SECP256K1_P
  return { x: xr, y: (y + SECP256K1_P) % SECP256K1_P }
}

/**
 * 点加。null 表示无穷远点 O：
 * O + q = q，p + O = p，p + (−p) = O，同点则退化为加倍。
 */
export function pointAdd(p: ECPoint | null, q: ECPoint | null): ECPoint | null {
  if (p === null) return q
  if (q === null) return p
  if (p.x === q.x) {
    if ((p.y + q.y) % SECP256K1_P === 0n) return null
    return pointDouble(p)
  }
  const lambda = (((q.y - p.y) % SECP256K1_P) + SECP256K1_P) % SECP256K1_P
  const lam =
    (lambda * modInv((((q.x - p.x) % SECP256K1_P) + SECP256K1_P) % SECP256K1_P, SECP256K1_P)) %
    SECP256K1_P
  const x = (lam * lam - p.x - q.x) % SECP256K1_P
  const xr = (x + SECP256K1_P) % SECP256K1_P
  const y = (lam * (p.x - xr) - p.y) % SECP256K1_P
  return { x: xr, y: (y + SECP256K1_P) % SECP256K1_P }
}

/**
 * 标量乘法 k·G（left-to-right double-and-add，从最高位开始）。
 * 前置条件：1 ≤ k < n。最高位恒为 1，故 acc 初始化为 G 后永不为无穷远点。
 */
export function pointMul(k: bigint): ECPoint {
  if (k < 1n || k >= SECP256K1_N) throw new Error('标量须满足 1 ≤ k < n')
  const g: ECPoint = { x: SECP256K1_GX, y: SECP256K1_GY }
  const bits = k.toString(2)
  let acc: ECPoint = g
  for (let i = 1; i < bits.length; i += 1) {
    const doubled = pointDouble(acc)
    // 2p+bit 恒为 k 的二进制前缀（< n），与 G 相加永不落到无穷远点
    acc = bits[i] === '1' ? pointAdd(doubled, g)! : doubled
  }
  return acc
}

/** bigint 转固定 64 位 hex */
function toHex64(v: bigint): string {
  return v.toString(16).padStart(64, '0')
}

/** 解析私钥 hex（可选 0x，64 位 hex，1 ≤ k < n） */
export function parsePrivateKeyHex(text: string): bigint {
  const trimmed = text.trim()
  const m = /^(0[xX])?([0-9a-fA-F]{64})$/.exec(trimmed)
  if (!m) throw new Error('私钥格式错误：应为 64 位十六进制字符（可带 0x 前缀）')
  const k = BigInt(`0x${m[2]}`)
  if (k < 1n || k >= SECP256K1_N) throw new Error('私钥数值无效：须满足 1 ≤ k < n')
  return k
}

export interface PublicKeyResult {
  /** 非压缩公钥：04 + x + y（130 位 hex） */
  uncompressed: string
  /** 压缩公钥：02/03 + x（66 位 hex） */
  compressed: string
}

/** 私钥 → 公钥（非压缩 / 压缩） */
export function privateToPublic(privHex: string): PublicKeyResult {
  const k = parsePrivateKeyHex(privHex)
  const p = pointMul(k)
  const xHex = toHex64(p.x)
  const yHex = toHex64(p.y)
  return {
    uncompressed: `04${xHex}${yHex}`,
    compressed: `${p.y % 2n === 0n ? '02' : '03'}${xHex}`,
  }
}

/* ---------------- Keccak-256（与 #691 address-validate 同构） ---------------- */

const MASK64 = (1n << 64n) - 1n

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

const ROT: readonly number[] = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
]

function rotl64(value: bigint, shift: number): bigint {
  const s = BigInt(shift)
  return ((value << s) | (value >> (64n - s))) & MASK64
}

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

/** Keccak-256：速率 136 字节，padding 首字节 0x01、末字节或 0x80 */
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

/** hex（偶数位）转字节数组 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('hex 格式错误：须为偶数位十六进制字符')
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** EIP-55 checksum 编码：40 位 hex（可带 0x）→ 带 0x 的 checksum 地址 */
export function toChecksumAddress(address: string): string {
  const hex = address.startsWith('0x') || address.startsWith('0X') ? address.slice(2) : address
  const lower = hex.toLowerCase()
  const hash = bytesToHex(keccak256(new TextEncoder().encode(lower)))
  let out = '0x'
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i]
    out += /[a-f]/.test(ch) && parseInt(hash[i], 16) >= 8 ? ch.toUpperCase() : ch
  }
  return out
}

/**
 * 非压缩公钥（04 + 64 位 x + 64 位 y 的 hex，可带 0x）→ EIP-55 以太坊地址。
 * 取 keccak256(64 字节公钥体) 的后 20 字节。
 */
export function publicToAddress(uncompressedHex: string): string {
  const trimmed = uncompressedHex.trim()
  const m = /^(0[xX])?([0-9a-fA-F]{130})$/.exec(trimmed)
  if (!m) throw new Error('公钥格式错误：应为 04 开头的 130 位十六进制字符')
  if (!m[2].startsWith('04')) throw new Error('非压缩公钥须以 04 开头')
  const body = hexToBytes(m[2].slice(2))
  const hash = keccak256(body)
  return toChecksumAddress(bytesToHex(hash.slice(12)))
}

/* ---------------- BIP32 ---------------- */

export interface HDKey {
  /** 32 字节私钥 */
  priv: Uint8Array
  /** 32 字节链码 */
  chainCode: Uint8Array
}

/** HMAC-SHA-512 函数签名（可注入，测试用 mock 触发防御分支） */
export type HmacSha512Fn = (key: Uint8Array, data: Uint8Array) => Uint8Array

/** 解析 64 位 hex 种子（BIP39 种子为 64 字节，也兼容 16–64 字节） */
export function parseSeedHex(text: string): Uint8Array {
  const t = text.trim().replace(/^0[xX]/, '')
  if (!/^[0-9a-fA-F]+$/.test(t) || t.length % 2 !== 0) {
    throw new Error('种子格式错误：应为十六进制字符（偶数位）')
  }
  const bytes = hexToBytes(t)
  if (bytes.length < 16 || bytes.length > 64) {
    throw new Error('种子长度错误：须为 16–64 字节（128–512 位）')
  }
  return bytes
}

/**
 * 主密钥：HMAC-SHA-512(key="Bitcoin seed", data=seed)，
 * 前 32 字节为私钥（须满足 1 ≤ k < n），后 32 字节为链码。
 * hmac 可注入；测试用 mock 触发 k 无效分支。
 */
export function masterKeyFromSeed(seed: Uint8Array, hmac: HmacSha512Fn = hmacSha512): HDKey {
  const i = hmac(new TextEncoder().encode('Bitcoin seed'), seed)
  const priv = i.slice(0, 32)
  const k = BigInt(`0x${bytesToHex(priv)}`)
  if (k === 0n || k >= SECP256K1_N) throw new Error('主密钥无效：超出曲线阶范围（请更换种子）')
  return { priv, chainCode: i.slice(32) }
}

/** 压缩公钥（33 字节）：02/03 + x */
function compressedPubkey(priv: Uint8Array): Uint8Array {
  const k = BigInt(`0x${bytesToHex(priv)}`)
  const p = pointMul(k)
  const out = new Uint8Array(33)
  out[0] = p.y % 2n === 0n ? 0x02 : 0x03
  const xb = hexToBytes(p.x.toString(16).padStart(64, '0'))
  out.set(xb, 1)
  return out
}

/**
 * 子密钥推导（CKDpriv）：index ≥ 0x80000000 为硬化。
 * data = 0x00‖priv‖index（硬化）或 压缩公钥‖index（非硬化）。
 * hmac 可注入；测试用 mock 触发 IL 无效 / 子密钥为 0 分支。
 */
export function deriveChildKey(
  parent: HDKey,
  index: number,
  hmac: HmacSha512Fn = hmacSha512,
): HDKey {
  if (!Number.isInteger(index) || index < 0 || index > 0xffffffff) {
    throw new Error('推导序号错误：须为 0–4294967295 的整数')
  }
  const hardened = index >= 0x80000000
  const data = new Uint8Array(37)
  if (hardened) {
    data[0] = 0x00
    data.set(parent.priv, 1)
  } else {
    data.set(compressedPubkey(parent.priv), 0)
  }
  const dv = new DataView(data.buffer)
  dv.setUint32(33, index)
  const i = hmac(parent.chainCode, data)
  const il = BigInt(`0x${bytesToHex(i.slice(0, 32))}`)
  if (il >= SECP256K1_N) throw new Error('推导失败：IL 超出曲线阶（极罕见，请更换路径）')
  const childNum = (il + BigInt(`0x${bytesToHex(parent.priv)}`)) % SECP256K1_N
  if (childNum === 0n) throw new Error('推导失败：子密钥为 0（极罕见，请更换路径）')
  const priv = hexToBytes(childNum.toString(16).padStart(64, '0'))
  return { priv, chainCode: i.slice(32) }
}

/** 解析推导路径 "m/44'/60'/0'/0/0" →序号数组（硬化序号 +' 标记） */
export function parsePath(path: string): number[] {
  const t = path.trim()
  if (!/^m(\/[0-9]+'?)*$/.test(t)) {
    throw new Error("路径格式错误：形如 m/44'/60'/0'/0/0（' 表示硬化）")
  }
  const parts = t.split('/').slice(1)
  return parts.map((part) => {
    const hardened = part.endsWith("'")
    const num = parseInt(hardened ? part.slice(0, -1) : part, 10)
    if (num >= 0x80000000) throw new Error('路径序号错误：单节须小于 2147483648')
    return hardened ? num + 0x80000000 : num
  })
}

/** 按路径从主密钥推导 */
export function derivePath(master: HDKey, path: string, hmac: HmacSha512Fn = hmacSha512): HDKey {
  let key = master
  for (const index of parsePath(path)) {
    key = deriveChildKey(key, index, hmac)
  }
  return key
}

/** 私钥（32 字节）→ EIP-55 以太坊地址 */
export function privateKeyToAddress(priv: Uint8Array): string {
  const k = BigInt(`0x${bytesToHex(priv)}`)
  if (k < 1n || k >= SECP256K1_N) throw new Error('私钥数值无效：须满足 1 ≤ k < n')
  const p = pointMul(k)
  const body = hexToBytes(p.x.toString(16).padStart(64, '0') + p.y.toString(16).padStart(64, '0'))
  const hash = keccak256(body)
  return toChecksumAddress(bytesToHex(hash.slice(12)))
}

/** 种子 hex + 路径 → 地址（一站式） */
export function seedToAddress(seedHex: string, path: string): string {
  const master = masterKeyFromSeed(parseSeedHex(seedHex))
  return privateKeyToAddress(derivePath(master, path).priv)
}

export interface DerivedEntry {
  index: number
  path: string
  privHex: string
  address: string
}

/**
 * 批量派生：basePath 如 "m/44'/60'/0'/0"，序号 from–to（含两端，最多 20 个）。
 */
export function deriveAddressRange(
  seedHex: string,
  basePath: string,
  from: number,
  to: number,
  hmac: HmacSha512Fn = hmacSha512,
): DerivedEntry[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0) {
    throw new Error('序号须为非负整数')
  }
  if (from > to) throw new Error('起始序号不能大于结束序号')
  if (to - from + 1 > 20) throw new Error('批量最多 20 个地址')
  const base = basePath.trim().replace(/\/$/, '')
  if (!/^m(\/[0-9]+'?)*$/.test(base)) throw new Error("路径格式错误：形如 m/44'/60'/0'/0")
  const master = masterKeyFromSeed(parseSeedHex(seedHex), hmac)
  const baseKey = derivePath(master, base, hmac)
  const out: DerivedEntry[] = []
  for (let i = from; i <= to; i += 1) {
    const child = deriveChildKey(baseKey, i, hmac)
    out.push({
      index: i,
      path: `${base}/${i}`,
      privHex: bytesToHex(child.priv),
      address: privateKeyToAddress(child.priv),
    })
  }
  return out
}
