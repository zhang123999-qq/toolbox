/**
 * sign-verify（#704）工具函数：
 * personal_sign 签名与 ecrecover 验签——RFC6979 确定性 k（HMAC-SHA-256 手写）、
 * secp256k1 / Keccak-256 手写（与 #693 public-key 同构）。
 * 密码学正确性由 Python ecdsa 库独立生成的签名向量验证。
 * 全部纯函数，便于单测。
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


/** secp256k1 素数域 p */
export const SECP256K1_P =
  0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn
/** secp256k1 阶 n */
export const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
/** 生成元 G */
export const SECP256K1_GX =
  0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n
export const SECP256K1_GY =
  0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n

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
  const lambda =
    (((q.y - p.y) % SECP256K1_P) + SECP256K1_P) % SECP256K1_P
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
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
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



/* ---------------- personal_sign / RFC6979 / ecrecover ---------------- */

/** 以太坊 personal_sign 消息哈希：keccak("\x19Ethereum Signed Message:\n" + len + message) */
export function personalMessageHash(message: string): Uint8Array {
  const msgBytes = new TextEncoder().encode(message)
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msgBytes.length}`)
  const data = new Uint8Array(prefix.length + msgBytes.length)
  data.set(prefix)
  data.set(msgBytes, prefix.length)
  return keccak256(data)
}

/** HMAC-SHA-256（手写） */
export function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  let k = key
  if (k.length > 64) k = sha256Bytes(k)
  const padded = new Uint8Array(64)
  padded.set(k)
  const inner = new Uint8Array(64 + data.length)
  const outer = new Uint8Array(64 + 32)
  for (let i = 0; i < 64; i += 1) {
    inner[i] = padded[i] ^ 0x36
    outer[i] = padded[i] ^ 0x5c
  }
  inner.set(data, 64)
  const innerHash = sha256Bytes(inner)
  outer.set(innerHash, 64)
  return sha256Bytes(outer)
}

/** 模幂（二进制快速幂） */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod <= 0n) throw new Error('模数须为正数')
  if (exp < 0n) throw new Error('指数须为非负数')
  let result = 1n
  let b = ((base % mod) + mod) % mod
  let e = exp
  while (e > 0n) {
    if (e % 2n === 1n) result = (result * b) % mod
    b = (b * b) % mod
    e /= 2n
  }
  return result
}

/** 通用标量乘法 k·P（0 ≤ k < n）；k = 0 返回 null（无穷远点） */
export function scalarMul(k: bigint, p: ECPoint): ECPoint | null {
  if (k < 0n || k >= SECP256K1_N) throw new Error('标量须满足 0 ≤ k < n')
  let acc: ECPoint | null = null
  const bits = k.toString(2)
  for (let i = 0; i < bits.length; i += 1) {
    acc = acc === null ? null : pointDouble(acc)
    if (bits[i] === '1') acc = pointAdd(acc, p)
  }
  return acc
}

/** 点取负（无穷远点保持 null） */
function negPoint(p: ECPoint | null): ECPoint | null {
  if (p === null) return null
  return { x: p.x, y: (SECP256K1_P - p.y) % SECP256K1_P }
}

/** HMAC-SHA-256 函数签名（可注入） */
export type HmacSha256Fn = (key: Uint8Array, data: Uint8Array) => Uint8Array

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/**
 * RFC6979 确定性 k（HMAC-SHA-256，§3.2）。
 * hash 为 32 字节消息哈希（本工具中为 personal_sign 哈希，原样使用，不做 mod n 约减，
 * 与 python-ecdsa 的 sign_digest_deterministic 在 hash < n 时行为一致）。
 * hmac 可注入；maxAttempts 可调，测试用 mock 覆盖重试与耗尽分支。
 */
export function rfc6979(
  privKey: Uint8Array,
  hash: Uint8Array,
  hmac: HmacSha256Fn = hmacSha256,
  maxAttempts = 1000,
): bigint {
  if (privKey.length !== 32) throw new Error('私钥须为 32 字节')
  if (hash.length !== 32) throw new Error('哈希须为 32 字节')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('最大尝试次数须为正整数')
  }
  let v: Uint8Array = new Uint8Array(32).fill(1)
  let k: Uint8Array = new Uint8Array(32).fill(0)
  const zero = new Uint8Array([0])
  const one = new Uint8Array([1])
  k = hmac(k, concatBytes(v, zero, privKey, hash))
  v = hmac(k, v)
  k = hmac(k, concatBytes(v, one, privKey, hash))
  v = hmac(k, v)
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    v = hmac(k, v)
    const candidate = BigInt(`0x${bytesToHex(v)}`)
    if (candidate >= 1n && candidate < SECP256K1_N) return candidate
    k = hmac(k, concatBytes(v, zero))
    v = hmac(k, v)
  }
  throw new Error('RFC6979 生成 k 失败：超过最大尝试次数')
}

/** 校验 (r, s)：1 ≤ r,s < n（可单测，供 sign / ecrecover 复用） */
export function assertValidRS(r: bigint, s: bigint): void {
  if (r < 1n || r >= SECP256K1_N || s < 1n || s >= SECP256K1_N) {
    throw new Error('签名 (r, s) 超出范围：须满足 1 ≤ r,s < n')
  }
}

/** EIP-2 低 S 规范化：s > n/2 则 s = n - s（可单测） */
export function normalizeLowS(s: bigint): bigint {
  if (s < 1n || s >= SECP256K1_N) throw new Error('s 超出范围：须满足 1 ≤ s < n')
  return s > SECP256K1_N / 2n ? SECP256K1_N - s : s
}

export interface Signature {
  r: bigint
  s: bigint
  /** 以太坊 v：27 / 28 */
  v: number
}

/** 确定性 k 函数签名（可注入） */
export type DeterministicKFn = (privKey: Uint8Array, hash: Uint8Array) => bigint

/**
 * personal_sign 签名：RFC6979 确定性 k，输出 {r, s, v}（低 S 值规范化）。
 * kFn 可注入；k 超出范围抛错。
 */
export function sign(
  hash: Uint8Array,
  privHex: string,
  kFn: DeterministicKFn = (p, h) => rfc6979(p, h),
): Signature {
  if (hash.length !== 32) throw new Error('哈希须为 32 字节')
  const privNum = parsePrivateKeyHex(privHex)
  const privBytes = hexToBytes(privNum.toString(16).padStart(64, '0'))
  const e = BigInt(`0x${bytesToHex(hash)}`)
  const k = kFn(privBytes, hash)
  if (k < 1n || k >= SECP256K1_N) throw new Error('k 超出范围：须满足 1 ≤ k < n')
  const rPoint = pointMul(k)
  const r = rPoint.x % SECP256K1_N
  const sRaw = (modInv(k, SECP256K1_N) * (e + r * privNum)) % SECP256K1_N
  assertValidRS(r, sRaw)
  // EIP-2 低 S 规范化：s 取反时 recovery id 同步翻转
  // （s' = n − s，则 s'·(−R) = s·R，−R 的 y 奇偶性相反）
  const flipped = sRaw > SECP256K1_N / 2n
  const s = flipped ? SECP256K1_N - sRaw : sRaw
  const recId = (rPoint.y % 2n === 0n ? 0 : 1) ^ (flipped ? 1 : 0)
  return { r, s, v: 27 + recId }
}

/** 签名 → 65 字节 hex（r‖s‖v，可带 0x） */
export function signatureToHex(sig: Signature): string {
  return (
    '0x' +
    sig.r.toString(16).padStart(64, '0') +
    sig.s.toString(16).padStart(64, '0') +
    sig.v.toString(16).padStart(2, '0')
  )
}

export interface ParsedSignature {
  r: bigint
  s: bigint
  v: number
}

/** 解析 65 字节签名 hex（r‖s‖v，可带 0x） */
export function parseSignatureHex(text: string): ParsedSignature {
  const t = text.trim().replace(/^0[xX]/, '')
  if (!/^[0-9a-fA-F]{130}$/.test(t)) throw new Error('签名格式错误：应为 65 字节 hex（r‖s‖v）')
  const r = BigInt(`0x${t.slice(0, 64)}`)
  const s = BigInt(`0x${t.slice(64, 128)}`)
  const v = parseInt(t.slice(128, 130), 16)
  if (v !== 27 && v !== 28) throw new Error('签名 v 值错误：须为 27 或 28')
  assertValidRS(r, s)
  return { r, s, v }
}

/**
 * ecrecover：由 (hash, r, s, v) 恢复公钥点。
 * Q = r⁻¹(sR − eG)，R 由 x = r 与 v 的奇偶性重建。
 */
export function ecrecover(hash: Uint8Array, r: bigint, s: bigint, v: number): ECPoint {
  if (hash.length !== 32) throw new Error('哈希须为 32 字节')
  assertValidRS(r, s)
  if (v !== 27 && v !== 28) throw new Error('v 须为 27 或 28')
  const recId = v - 27
  // r < n < p，可直接作为曲线点 x 坐标
  const rhs = (r * r * r + 7n) % SECP256K1_P
  let y = modPow(rhs, (SECP256K1_P + 1n) / 4n, SECP256K1_P)
  if ((y * y) % SECP256K1_P !== rhs) throw new Error('r 不在 secp256k1 曲线上')
  if (y % 2n !== BigInt(recId)) y = SECP256K1_P - y
  const rPoint: ECPoint = { x: r, y }
  const e = BigInt(`0x${bytesToHex(hash)}`) % SECP256K1_N
  const rInv = modInv(r, SECP256K1_N)
  // s ≥ 1 且曲线阶为素数，sR 永不为无穷远点
  const sR = scalarMul(s, rPoint)!
  const eG = scalarMul(e, { x: SECP256K1_GX, y: SECP256K1_GY })
  const diff = pointAdd(sR, negPoint(eG))
  if (diff === null) throw new Error('ecrecover 失败：点减结果为无穷远点')
  // rInv ≥ 1 且 diff 非无穷远点，q 永不为无穷远点
  const q = scalarMul(rInv, diff)!
  return q
}

/** ecrecover → EIP-55 地址 */
export function recoverAddress(hash: Uint8Array, r: bigint, s: bigint, v: number): string {
  const q = ecrecover(hash, r, s, v)
  return publicToAddress(
    `04${q.x.toString(16).padStart(64, '0')}${q.y.toString(16).padStart(64, '0')}`,
  )
}

export interface VerifyResult {
  recovered: string
  match: boolean
}

/** 验签：消息 + 签名 hex → 恢复地址并与给定地址比对 */
export function verifySignature(
  address: string,
  message: string,
  signatureHex: string,
): VerifyResult {
  const t = address.trim()
  if (!/^0[xX][0-9a-fA-F]{40}$/.test(t)) {
    throw new Error('地址格式错误：应为 0x 开头的 40 位十六进制字符')
  }
  const hash = personalMessageHash(message)
  const { r, s, v } = parseSignatureHex(signatureHex)
  const recovered = recoverAddress(hash, r, s, v)
  return { recovered, match: recovered.toLowerCase() === t.toLowerCase() }
}
