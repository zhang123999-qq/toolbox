import type { MultiChainInput, MultiChainOptions } from './schema'

/* ---------- SHA-256（手写，同步版本） ---------- */

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

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

/** SHA-256，输入输出均为字节串 */
export function sha256(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const bitLen = data.length * 8
  const paddedLen = (((data.length + 8) >> 6) + 1) << 6
  const padded = new Uint8Array(paddedLen)
  padded.set(data)
  padded[data.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLen - 4, bitLen >>> 0, false)
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false)

  const w = new Array<number>(64)
  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false) >>> 0
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }
  const out = new Uint8Array(32)
  const ov = new DataView(out.buffer)
  ov.setUint32(0, h0, false)
  ov.setUint32(4, h1, false)
  ov.setUint32(8, h2, false)
  ov.setUint32(12, h3, false)
  ov.setUint32(16, h4, false)
  ov.setUint32(20, h5, false)
  ov.setUint32(24, h6, false)
  ov.setUint32(28, h7, false)
  return out
}

/* ---------- Base58（比特币字母表） ---------- */

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58Encode(data: Uint8Array): string {
  let n = 0n
  for (const b of data) n = (n << 8n) | BigInt(b)
  let out = ''
  while (n > 0n) {
    out = B58_ALPHABET[Number(n % 58n)] + out
    n /= 58n
  }
  for (const b of data) {
    if (b !== 0) break
    out = '1' + out
  }
  return out
}

export function base58Decode(text: string): Uint8Array {
  const t = text.trim()
  if (t === '') throw new Error('base58 输入为空')
  let n = 0n
  for (const ch of t) {
    const idx = B58_ALPHABET.indexOf(ch)
    if (idx < 0) throw new Error(`base58 非法字符：${ch}`)
    n = n * 58n + BigInt(idx)
  }
  const bytes: number[] = []
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn))
    n >>= 8n
  }
  let leading = 0
  for (const ch of t) {
    if (ch !== '1') break
    leading++
  }
  const out = new Uint8Array(leading + bytes.length)
  out.set(bytes, leading)
  return out
}

/* ---------- hex 辅助 ---------- */

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex
  if (!/^[0-9a-fA-F]*$/.test(h)) throw new Error('hex 含非法字符')
  if (h.length % 2 !== 0) throw new Error('hex 长度必须为偶数')
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function checksum4(payload: Uint8Array): Uint8Array {
  return sha256(sha256(payload)).slice(0, 4)
}

/* ---------- ETH ↔ TRON ---------- */

/** 校验并规范化 ETH 地址（返回不带 0x 的小写 40 hex） */
function normalizeEth(hex: string): string {
  const h =
    hex.trim().startsWith('0x') || hex.trim().startsWith('0X') ? hex.trim().slice(2) : hex.trim()
  if (!/^[0-9a-fA-F]{40}$/.test(h))
    throw new Error(`ETH 地址格式非法：${hex.trim()}（应为 0x + 40 位 hex）`)
  return h.toLowerCase()
}

/** ETH 地址 → TRON base58 地址 */
export function ethToTron(ethHex: string): string {
  const addr = hexToBytes(normalizeEth(ethHex))
  const payload = new Uint8Array(21)
  payload[0] = 0x41
  payload.set(addr, 1)
  const full = new Uint8Array(25)
  full.set(payload)
  full.set(checksum4(payload), 21)
  return base58Encode(full)
}

/** TRON base58 地址 → ETH 地址（0x 前缀小写 hex） */
export function tronToEth(tronAddr: string): string {
  const raw = base58Decode(tronAddr)
  if (raw.length !== 25)
    throw new Error(`TRON 地址长度非法：解码后 ${raw.length} 字节，应为 25 字节`)
  if (raw[0] !== 0x41) throw new Error('TRON 地址前缀非法：首字节应为 0x41')
  const payload = raw.slice(0, 21)
  const check = raw.slice(21)
  const expect = checksum4(payload)
  for (let i = 0; i < 4; i++) {
    if (check[i] !== expect[i]) throw new Error('TRON 地址校验和错误')
  }
  return '0x' + bytesToHex(payload.slice(1))
}

export type ConvertDirection = 'auto' | 'eth-to-tron' | 'tron-to-eth'

export interface ConvertResult {
  readonly input: string
  readonly output: string
  readonly error?: string
}

/** 未知错误 → 中文可读信息（可单独测试） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function looksLikeEth(text: string): boolean {
  return /^(0x)?[0-9a-fA-F]{40}$/.test(text.trim())
}

/** 转换单行地址；direction=auto 时按格式自动判断 */
export function convertAddress(line: string, direction: ConvertDirection): ConvertResult {
  const input = line.trim()
  if (input === '') return { input, output: '', error: '空行' }
  try {
    if (direction === 'tron-to-eth' || (direction === 'auto' && !looksLikeEth(input))) {
      return { input, output: tronToEth(input) }
    }
    return { input, output: ethToTron(input) }
  } catch (e) {
    return { input, output: '', error: errorMessage(e) }
  }
}

/** 批量转换（每行一个地址） */
export function convertAll(input: MultiChainInput, options: MultiChainOptions): ConvertResult[] {
  return input.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .map((line) => convertAddress(line, options.direction))
}
