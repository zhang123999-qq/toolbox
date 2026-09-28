/**
 * abi-codec（#695）工具函数：
 * Solidity ABI 编解码（纯 JS）—— 函数签名解析、uint/int/address/bool/
 * bytes<M>/bytes/string/数组（T[] / T[k]，支持嵌套动态数组）的编码与解码。
 * 函数选择器用 Keccak-256（实现与 #691 同构）。不支持 tuple。
 * 全部纯函数，便于单测。
 */

export type AbiType =
  | { kind: 'uint'; bits: number }
  | { kind: 'int'; bits: number }
  | { kind: 'address' }
  | { kind: 'bool' }
  | { kind: 'bytesN'; size: number }
  | { kind: 'bytes' }
  | { kind: 'string' }
  | { kind: 'array'; elem: AbiType; length: number | null }

const MASK256 = (1n << 256n) - 1n

/* ---------------- 基础字节工具 ---------------- */

/** 字节数组转小写 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 拼接多个 Uint8Array */
export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/** bigint → 32 字节大端字（须 0 ≤ v < 2^256） */
export function wordFromBigint(v: bigint): Uint8Array {
  if (v < 0n || v > MASK256) throw new Error('数值超出 32 字节字范围')
  const out = new Uint8Array(32)
  let x = v
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(x & 0xffn)
    x >>= 8n
  }
  return out
}

/** 32 字节大端字 → bigint */
export function wordToBigint(word: Uint8Array): bigint {
  let v = 0n
  for (const b of word) v = (v << 8n) | BigInt(b)
  return v
}

/** 去 0x 前缀 */
function strip0x(s: string): string {
  return s.startsWith('0x') || s.startsWith('0X') ? s.slice(2) : s
}

/** hex → 字节数组（偶数位 hex） */
export function hexToBytes(hex: string): Uint8Array {
  const h = strip0x(hex.trim())
  if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) {
    throw new Error('hex 格式错误：须为偶数位十六进制字符')
  }
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** 数据右补零到 32 字节倍数 */
function padRight32(data: Uint8Array): Uint8Array {
  const padded = Math.ceil(data.length / 32) * 32
  const out = new Uint8Array(padded)
  out.set(data)
  return out
}

/* ---------------- Keccak-256（与 #691 同构，用于函数选择器） ---------------- */

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

/** EIP-55 checksum 编码 */
export function toChecksumAddress(address: string): string {
  const hex = strip0x(address).toLowerCase()
  const hash = bytesToHex(keccak256(new TextEncoder().encode(hex)))
  let out = '0x'
  for (let i = 0; i < hex.length; i += 1) {
    const ch = hex[i]
    out += /[a-f]/.test(ch) && parseInt(hash[i], 16) >= 8 ? ch.toUpperCase() : ch
  }
  return out
}

/* ---------------- 类型解析 ---------------- */

export type StaticAbiType = Extract<
  AbiType,
  { kind: 'uint' } | { kind: 'int' } | { kind: 'address' } | { kind: 'bool' } | { kind: 'bytesN' }
>
export type DynamicAbiType = Extract<AbiType, { kind: 'bytes' } | { kind: 'string' } | { kind: 'array' }>

/** 是否为动态类型（类型谓词，else 分支收窄为静态类型） */
export function isDynamicType(t: AbiType): t is DynamicAbiType {
  if (t.kind === 'bytes' || t.kind === 'string') return true
  if (t.kind === 'array') return t.length === null || isDynamicType(t.elem)
  return false
}

/** 类型的规范字符串（用于选择器） */
export function canonicalType(t: AbiType): string {
  switch (t.kind) {
    case 'uint':
      return `uint${t.bits}`
    case 'int':
      return `int${t.bits}`
    case 'address':
      return 'address'
    case 'bool':
      return 'bool'
    case 'bytesN':
      return `bytes${t.size}`
    case 'bytes':
      return 'bytes'
    case 'string':
      return 'string'
    case 'array':
      return `${canonicalType(t.elem)}[${t.length === null ? '' : t.length}]`
  }
}

function parseBits(num: string, kind: 'uint' | 'int', raw: string): number {
  // 调用方正则已保证 num 为纯数字（可空）
  const bits = num === '' ? 256 : parseInt(num, 10)
  if (bits < 8 || bits > 256 || bits % 8 !== 0) {
    throw new Error(`不支持的类型：${raw}（${kind} 位宽须为 8–256 且为 8 的倍数）`)
  }
  return bits
}

/** 解析 ABI 类型字符串；不支持 tuple */
export function parseType(s: string): AbiType {
  const t = s.trim()
  if (t === '') throw new Error('类型不能为空')
  const arrM = /^(.*)\[(\d*)\]$/.exec(t)
  if (arrM) {
    if (arrM[1] === '') throw new Error(`类型格式错误：${s}`)
    // 正则已保证长度部分为纯数字（可空）
    const length = arrM[2] === '' ? null : parseInt(arrM[2], 10)
    return { kind: 'array', elem: parseType(arrM[1]), length }
  }
  if (t === 'address') return { kind: 'address' }
  if (t === 'bool') return { kind: 'bool' }
  if (t === 'bytes') return { kind: 'bytes' }
  if (t === 'string') return { kind: 'string' }
  let m = /^uint(\d*)$/.exec(t)
  if (m) return { kind: 'uint', bits: parseBits(m[1], 'uint', s) }
  m = /^int(\d*)$/.exec(t)
  if (m) return { kind: 'int', bits: parseBits(m[1], 'int', s) }
  m = /^bytes(\d+)$/.exec(t)
  if (m) {
    const size = parseInt(m[1], 10)
    if (size < 1 || size > 32) throw new Error(`不支持的类型：${s}（bytes<M> 的 M 须为 1–32）`)
    return { kind: 'bytesN', size }
  }
  throw new Error(`不支持的类型：${s}（暂不支持 tuple）`)
}

export interface ParsedSignature {
  name: string
  types: AbiType[]
}

/** 解析函数签名，如 transfer(address,uint256) */
export function parseSignature(sig: string): ParsedSignature {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/.exec(sig.trim())
  if (!m) throw new Error('签名格式错误，应为 name(type1,type2,…) 形式')
  const paramText = m[2].trim()
  const types = paramText === '' ? [] : paramText.split(',').map((p) => parseType(p))
  return { name: m[1], types }
}

/** 函数选择器：keccak256(规范签名) 前 4 字节，带 0x */
export function functionSelector(sig: string): string {
  const { name, types } = parseSignature(sig)
  const canonical = `${name}(${types.map(canonicalType).join(',')})`
  return `0x${bytesToHex(keccak256(new TextEncoder().encode(canonical))).slice(0, 8)}`
}

/* ---------------- 值解析 ---------------- */

function parseUintValue(value: string, bits: number): bigint {
  const v = value.trim()
  let n: bigint
  try {
    // BigInt 原生支持十进制与 0x 十六进制
    n = BigInt(v)
  } catch {
    throw new Error(`uint${bits} 参数非法：${value}`)
  }
  if (n < 0n || n >= 1n << BigInt(bits)) {
    throw new Error(`uint${bits} 越界：${value}（须 0 ≤ v < 2^${bits}）`)
  }
  return n
}

function parseIntValue(value: string, bits: number): bigint {
  const v = value.trim()
  if (v.startsWith('0x') || v.startsWith('0X')) {
    // 0x 视为补码位模式
    let n: bigint
    try {
      n = BigInt(v)
    } catch {
      throw new Error(`int${bits} 参数非法：${value}`)
    }
    if (n >= 1n << BigInt(bits)) throw new Error(`int${bits} 越界：${value}`)
    return n
  }
  let n: bigint
  try {
    n = BigInt(v)
  } catch {
    throw new Error(`int${bits} 参数非法：${value}`)
  }
  const limit = 1n << BigInt(bits - 1)
  if (n < -limit || n >= limit) {
    throw new Error(`int${bits} 越界：${value}（须 −2^${bits - 1} ≤ v < 2^${bits - 1}）`)
  }
  return n & MASK256
}

function parseAddressValue(value: string): Uint8Array {
  const h = strip0x(value.trim())
  if (!/^[0-9a-fA-F]{40}$/.test(h)) throw new Error(`address 参数非法：${value}（须为 40 位 hex）`)
  return hexToBytes(h)
}

function parseBoolValue(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  throw new Error(`bool 参数非法：${value}（须为 true / false / 1 / 0）`)
}

function parseBytesNValue(value: string, size: number): Uint8Array {
  const b = hexToBytes(value.trim())
  if (b.length !== size) {
    throw new Error(`bytes${size} 参数非法：须为 ${size} 字节（${size * 2} 位 hex）`)
  }
  return b
}

/** 数组参数：JSON 数组，各元素归一化为字符串（嵌套数组转回 JSON） */
export function parseJsonArray(value: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('数组参数须为 JSON 数组，如 ["1","2","3"]')
  }
  if (!Array.isArray(parsed)) throw new Error('数组参数须为 JSON 数组，如 ["1","2","3"]')
  return parsed.map((e: unknown) => {
    if (typeof e === 'string') return e
    if (typeof e === 'number' || typeof e === 'boolean') return String(e)
    if (Array.isArray(e)) return JSON.stringify(e)
    throw new Error('数组元素须为字符串 / 数字 / 布尔值（嵌套数组可嵌套 JSON）')
  })
}

/* ---------------- 编码 ---------------- */

/** 静态类型编码为 32 字节字（调用方须先用 isDynamicType 排除动态类型） */
export function encodeStatic(t: StaticAbiType, value: string): Uint8Array {
  switch (t.kind) {
    case 'uint':
      return wordFromBigint(parseUintValue(value, t.bits))
    case 'int':
      return wordFromBigint(parseIntValue(value, t.bits))
    case 'address': {
      const out = new Uint8Array(32)
      out.set(parseAddressValue(value), 12)
      return out
    }
    case 'bool':
      return wordFromBigint(parseBoolValue(value) ? 1n : 0n)
    case 'bytesN': {
      const out = new Uint8Array(32)
      out.set(parseBytesNValue(value, t.size), 0)
      return out
    }
  }
}

/** 动态类型编码（含长度前缀 / 偏移结构），返回完整尾段 */
export function encodeDynamic(t: DynamicAbiType, value: string): Uint8Array {
  switch (t.kind) {
    case 'bytes': {
      const b = hexToBytes(value.trim())
      return concatBytes([wordFromBigint(BigInt(b.length)), padRight32(b)])
    }
    case 'string': {
      const b = new TextEncoder().encode(value)
      return concatBytes([wordFromBigint(BigInt(b.length)), padRight32(b)])
    }
    case 'array': {
      const elems = parseJsonArray(value)
      if (t.length !== null && elems.length !== t.length) {
        throw new Error(`定长数组元素数量不符：期望 ${t.length}，实际 ${elems.length}`)
      }
      const seq = encodeSequence(
        elems.map(() => t.elem),
        elems,
      )
      // 动态数组带长度前缀；定长数组直接拼接元素序列
      return t.length === null ? concatBytes([wordFromBigint(BigInt(elems.length)), seq]) : seq
    }
  }
}

/**
 * 参数序列编码（head + tail，偏移相对于序列起始）。
 * 供顶层调用与动态数组元素编码复用。
 */
export function encodeSequence(types: AbiType[], values: string[]): Uint8Array {
  if (types.length !== values.length) {
    throw new Error(`类型与参数数量不一致：${types.length} 个类型，${values.length} 个参数`)
  }
  const heads: Uint8Array[] = []
  const tails: Uint8Array[] = []
  // 头部大小：动态类型占 32 字节偏移，静态类型按 staticSize
  let offset = types.reduce((n, t) => n + (isDynamicType(t) ? 32 : staticSize(t)), 0)
  for (let i = 0; i < types.length; i += 1) {
    const t = types[i]
    if (isDynamicType(t)) {
      heads.push(wordFromBigint(BigInt(offset)))
      const tail = encodeDynamic(t, values[i])
      tails.push(tail)
      offset += tail.length
    } else {
      heads.push(encodeStaticValue(t, values[i]))
    }
  }
  return concatBytes([...heads, ...tails])
}

/** ABI 编码参数（不含选择器），返回 0x hex */
export function abiEncode(types: AbiType[], values: string[]): string {
  return `0x${bytesToHex(encodeSequence(types, values))}`
}

/** 函数调用编码：选择器 + 参数，返回 0x hex */
export function encodeFunctionCall(sig: string, values: string[]): string {
  const { types } = parseSignature(sig)
  return `${functionSelector(sig)}${bytesToHex(encodeSequence(types, values))}`
}

/* ---------------- 解码 ---------------- */

/** 从 data 的 pos 处读取一个 32 字节字（越界抛错；调用方保证 pos ≥ 0） */
function readWord(data: Uint8Array, pos: number): Uint8Array {
  if (pos + 32 > data.length) {
    throw new Error(`calldata 越界：偏移 ${pos} 处读取 32 字节超出范围`)
  }
  return data.slice(pos, pos + 32)
}

/** 静态类型解码（word → 字符串值） */
function decodeStatic(t: StaticAbiType, word: Uint8Array): string {
  const v = wordToBigint(word)
  switch (t.kind) {
    case 'uint':
      return v.toString(10)
    case 'int': {
      // 符号位只看低 bits 位：先掩码再做符号扩展
      const bits = BigInt(t.bits)
      const low = v & ((1n << bits) - 1n)
      const limit = 1n << (bits - 1n)
      return (low >= limit ? low - (1n << bits) : low).toString(10)
    }
    case 'address':
      return toChecksumAddress(bytesToHex(word.slice(12)))
    case 'bool':
      if (v !== 0n && v !== 1n) throw new Error('bool 解码值非法：须为 0 或 1')
      return v === 1n ? 'true' : 'false'
    case 'bytesN':
      return `0x${bytesToHex(word.slice(0, t.size))}`
  }
}

/**
 * 定长且元素递归静态的数组（如 address[2]、uint8[2][3]）。
 * 按 ABI 规范属于静态类型，在头部内联拼接。
 */
function isStaticArray(t: AbiType): t is { kind: 'array'; elem: AbiType; length: number } {
  return t.kind === 'array' && t.length !== null && !isDynamicType(t.elem)
}

/** 静态类型在序列头部占据的字节数（静态数组按元素递归） */
function staticSize(t: AbiType): number {
  if (isStaticArray(t)) return t.length * staticSize(t.elem)
  return 32
}

/**
 * 编码静态值：静态标量，或定长且元素递归静态的数组（内联拼接）。
 * 调用方须保证 !isDynamicType(t)。
 */
function encodeStaticValue(t: AbiType, value: string): Uint8Array {
  if (isStaticArray(t)) {
    const elems = parseJsonArray(value)
    if (elems.length !== t.length) {
      throw new Error(`定长数组元素数量不符：期望 ${t.length}，实际 ${elems.length}`)
    }
    return concatBytes(elems.map((e) => encodeStaticValue(t.elem, e)))
  }
  return encodeStatic(t as StaticAbiType, value)
}

/**
 * 解码静态值（pos 为头部当前位置），返回字符串或嵌套数组。
 * 调用方须保证 !isDynamicType(t)。
 */
function decodeStaticValue(t: AbiType, data: Uint8Array, pos: number): string | unknown[] {
  if (isStaticArray(t)) {
    const stride = staticSize(t.elem)
    const values: unknown[] = []
    for (let i = 0; i < t.length; i += 1) {
      values.push(decodeStaticValue(t.elem, data, pos + i * stride))
    }
    return values
  }
  return decodeStatic(t as StaticAbiType, readWord(data, pos))
}

/**
 * 动态类型解码（pos 为尾段起始），返回字符串或嵌套数组。
 * 数组元素不再提前 JSON 序列化，统一由顶层格式化，避免双重编码。
 */
function decodeDynamicValue(t: DynamicAbiType, data: Uint8Array, pos: number): string | unknown[] {
  switch (t.kind) {
    case 'bytes':
    case 'string': {
      const len = wordToBigint(readWord(data, pos))
      if (len > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('动态数据长度超出安全范围')
      const start = pos + 32
      const end = start + Number(len)
      if (end > data.length) throw new Error('calldata 越界：动态数据长度超出范围')
      const raw = data.slice(start, end)
      return t.kind === 'bytes' ? `0x${bytesToHex(raw)}` : new TextDecoder().decode(raw)
    }
    case 'array': {
      let cursor = pos
      let count: number
      if (t.length === null) {
        const len = wordToBigint(readWord(data, pos))
        if (len > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('数组长度超出安全范围')
        count = Number(len)
        cursor = pos + 32
      } else {
        count = t.length
      }
      const elemTypes = Array.from({ length: count }, () => t.elem)
      // 复用序列解码：元素为动态类型时内部偏移相对于 cursor
      return decodeSequence(elemTypes, data, cursor)
    }
  }
}

/**
 * 参数序列解码。data 为完整 calldata，base 为序列头部起始；
 * 静态值按 staticSize 推进，动态值占 32 字节偏移字。
 */
function decodeSequence(types: AbiType[], data: Uint8Array, base: number): unknown[] {
  const values: unknown[] = []
  let headPos = base
  for (const t of types) {
    if (isDynamicType(t)) {
      const offset = wordToBigint(readWord(data, headPos))
      headPos += 32
      if (offset > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('偏移量超出安全范围')
      const abs = base + Number(offset)
      if (abs + 32 > data.length) {
        throw new Error(`calldata 越界：动态偏移 ${offset} 非法`)
      }
      values.push(decodeDynamicValue(t, data, abs))
    } else {
      values.push(decodeStaticValue(t, data, headPos))
      headPos += staticSize(t)
    }
  }
  return values
}

/** 顶层值格式化：字符串保持原样，嵌套数组序列化为 JSON */
function formatDecodedValue(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v)
}

/**
 * ABI 解码参数（不含选择器的 body），返回字符串值数组。
 * uint → 十进制；int → 十进制（可负）；address → EIP-55；
 * bool → true/false；bytes<M>/bytes → 0x hex；string → 文本；数组 → JSON。
 */
export function abiDecode(types: AbiType[], dataHex: string): string[] {
  const data = hexToBytes(dataHex)
  if (data.length < 32 * types.length) {
    throw new Error(`calldata 过短：至少需要 ${32 * types.length} 字节`)
  }
  if (data.length % 32 !== 0) {
    throw new Error('calldata 长度非法：须为 32 字节的倍数')
  }
  return decodeSequence(types, data, 0).map(formatDecodedValue)
}

export interface DecodedCall {
  name: string
  selector: string
  values: string[]
}

/** 解码完整 calldata（含 4 字节选择器），并校验选择器匹配签名 */
export function decodeFunctionCall(sig: string, dataHex: string): DecodedCall {
  const { name, types } = parseSignature(sig)
  const data = hexToBytes(dataHex)
  if (data.length < 4) throw new Error('calldata 过短：缺少 4 字节选择器')
  const selector = `0x${bytesToHex(data.slice(0, 4))}`
  const expected = functionSelector(sig)
  if (selector !== expected) {
    throw new Error(`选择器不匹配：calldata 为 ${selector}，签名 ${sig} 期望 ${expected}`)
  }
  const body = data.slice(4)
  if (body.length < 32 * types.length) {
    throw new Error(`calldata 参数区过短：至少需要 ${32 * types.length} 字节`)
  }
  if (body.length % 32 !== 0) {
    throw new Error('calldata 参数区长度非法：须为 32 字节的倍数')
  }
  return { name, selector, values: decodeSequence(types, body, 0).map(formatDecodedValue) }
}
