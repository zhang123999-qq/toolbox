/**
 * public-key（#693）工具函数：
 * 手写 secp256k1（BigInt，double-and-add 点乘）—— 私钥 → 非压缩 / 压缩公钥；
 * 公钥 → keccak256 → EIP-55 以太坊地址。
 * keccak256 / EIP-55 实现与 address-validate（#691）同构（Keccak padding 0x01…0x80）。
 * 全部纯函数，便于单测；密码学正确性由独立测试向量（Python ecdsa 库生成）保证。
 */

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

/** 私钥 → 公钥 → 地址，一站式 */
export function privateKeyInfo(privHex: string): PublicKeyResult & { address: string } {
  const keys = privateToPublic(privHex)
  return { ...keys, address: publicToAddress(keys.uncompressed) }
}
