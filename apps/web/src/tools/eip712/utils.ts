/**
 * #705 EIP-712 结构化数据哈希（utils）
 *
 * - encodeType / typeHash / encodeData / structHash / hashTypedData
 * - 支持嵌套 struct、静态 / 动态数组；非法类型抛中文错误
 * - Keccak-256 为本工具内手写实现（与 #703 hd-wallet 同构），无第三方依赖
 */

/* ---------------- Keccak-256（手写） ---------------- */

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

/* ---------------- 基础编解码 ---------------- */

const te = new TextEncoder()

export function utf8Bytes(s: string): Uint8Array {
  return te.encode(s)
}

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('十六进制格式错误：须为偶数位 hex 字符')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

function toBytes32(value: bigint): Uint8Array {
  // 调用方已校验范围（uint<M>/int<M>），此处不重复检查
  const out = new Uint8Array(32)
  let v = value
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

/* ---------------- 类型系统 ---------------- */

export interface EIP712Field {
  name: string
  type: string
}

export type EIP712Types = Record<string, EIP712Field[]>

/** JSON 值：string / number / bigint / boolean / Uint8Array / 数组 / 对象 */
export type EIP712Value =
  string | number | bigint | boolean | Uint8Array | EIP712Value[] | { [key: string]: EIP712Value }

const UINT_RE = /^uint(\d*)$/
const INT_RE = /^int(\d*)$/
const BYTES_N_RE = /^bytes(\d+)$/
const ARRAY_RE = /^(.+)\[(\d*)\]$/

function requireBits(kind: string, bitsText: string): number {
  const bits = bitsText === '' ? 256 : Number(bitsText)
  if (!Number.isInteger(bits) || bits < 8 || bits > 256 || bits % 8 !== 0) {
    throw new Error(`非法类型 ${kind}${bitsText}：位宽须为 8 的倍数且在 8–256 之间`)
  }
  return bits
}

/** 去掉数组后缀后的基础类型 */
function baseTypeOf(type: string): string {
  const m = ARRAY_RE.exec(type)
  return m ? m[1] : type
}

/** 是否为 struct 类型（在 types 中声明） */
function isStructType(type: string, types: EIP712Types): boolean {
  return Object.prototype.hasOwnProperty.call(types, baseTypeOf(type))
}

function checkAtomicType(type: string): void {
  const am = ARRAY_RE.exec(type)
  if (am) {
    checkAtomicType(am[1])
    return
  }
  if (type === 'address' || type === 'bool' || type === 'bytes' || type === 'string') return
  const um = UINT_RE.exec(type)
  if (um) {
    requireBits('uint', um[1])
    return
  }
  const im = INT_RE.exec(type)
  if (im) {
    requireBits('int', im[1])
    return
  }
  const bm = BYTES_N_RE.exec(type)
  if (bm) {
    const n = Number(bm[1])
    if (n < 1 || n > 32) throw new Error(`非法类型 ${type}：bytesN 的 N 须在 1–32 之间`)
    return
  }
  throw new Error(`非法类型 ${type}：未知的基本类型`)
}

/** 收集 primaryType 的全部依赖 struct（含自身），按字母序排列 */
function collectDependencies(primaryType: string, types: EIP712Types): string[] {
  if (!Object.prototype.hasOwnProperty.call(types, primaryType)) {
    throw new Error(`未知类型 ${primaryType}：未在 types 中声明`)
  }
  const deps = new Set<string>()
  const stack = [primaryType]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (deps.has(current)) continue
    deps.add(current)
    for (const field of types[current]) {
      const base = baseTypeOf(field.type)
      if (Object.prototype.hasOwnProperty.call(types, base)) {
        stack.push(base)
      } else {
        checkAtomicType(base)
      }
    }
  }
  return [...deps].sort()
}

/** EIP-712 encodeType：主类型在前，其余依赖按字母序 */
export function encodeType(primaryType: string, types: EIP712Types): string {
  const deps = collectDependencies(primaryType, types)
  const others = deps.filter((d) => d !== primaryType)
  const render = (name: string) =>
    `${name}(${types[name].map((f) => `${f.type} ${f.name}`).join(',')})`
  return render(primaryType) + others.map(render).join('')
}

/** typeHash = keccak256(encodeType) */
export function typeHash(primaryType: string, types: EIP712Types): Uint8Array {
  return keccak256(utf8Bytes(encodeType(primaryType, types)))
}

/* ---------------- 值编码 ---------------- */

function toBigInt(value: EIP712Value, what: string): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error(`${what} 须为整数`)
    return BigInt(value)
  }
  if (typeof value === 'string') {
    if (!/^-?\d+$/.test(value.trim())) throw new Error(`${what} 须为整数或整数字符串`)
    return BigInt(value.trim())
  }
  throw new Error(`${what} 须为整数、bigint 或整数字符串`)
}

function encodeAtomic(type: string, value: EIP712Value, fieldName: string): Uint8Array {
  const what = `字段 ${fieldName}`
  if (type === 'address') {
    if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error(`${what} 须为 0x 开头的 40 位十六进制地址`)
    }
    const out = new Uint8Array(32)
    out.set(hexToBytes(value), 12)
    return out
  }
  const um = UINT_RE.exec(type)
  if (um) {
    const bits = requireBits('uint', um[1])
    const v = toBigInt(value, what)
    if (v < 0n || v >= 1n << BigInt(bits)) throw new Error(`${what} 超出 uint${bits} 范围`)
    return toBytes32(v)
  }
  const im = INT_RE.exec(type)
  if (im) {
    const bits = requireBits('int', im[1])
    const v = toBigInt(value, what)
    const half = 1n << BigInt(bits - 1)
    if (v < -half || v >= half) throw new Error(`${what} 超出 int${bits} 范围`)
    return toBytes32(v < 0n ? v + (1n << 256n) : v)
  }
  if (type === 'bool') {
    if (typeof value !== 'boolean') throw new Error(`${what} 须为布尔值`)
    const out = new Uint8Array(32)
    out[31] = value ? 1 : 0
    return out
  }
  const bm = BYTES_N_RE.exec(type)
  if (bm) {
    const n = Number(bm[1])
    const raw = typeof value === 'string' ? hexToBytes(value) : value
    if (!(raw instanceof Uint8Array) || raw.length !== n) {
      throw new Error(`${what} 须为 ${n} 字节（hex 字符串或 Uint8Array）`)
    }
    const out = new Uint8Array(32)
    out.set(raw)
    return out
  }
  if (type === 'bytes') {
    const raw = typeof value === 'string' ? hexToBytes(value) : value
    if (!(raw instanceof Uint8Array)) throw new Error(`${what} 须为 hex 字符串或 Uint8Array`)
    return keccak256(raw)
  }
  // 剩余只可能是 string：collectDependencies 已校验全部字段类型合法
  if (typeof value !== 'string') throw new Error(`${what} 须为字符串`)
  return keccak256(utf8Bytes(value))
}

function isRecord(value: EIP712Value): value is { [key: string]: EIP712Value } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Uint8Array) &&
    !Array.isArray(value)
  )
}

/** encodeData：typeHash ‖ enc(v₁) ‖ …（数组元素先编码再整体 keccak） */
export function encodeData(primaryType: string, data: EIP712Value, types: EIP712Types): Uint8Array {
  if (!isRecord(data)) throw new Error(`类型 ${primaryType} 的值须为对象`)
  // typeHash 已校验 primaryType 在 types 中声明，此处直接取用
  const fields = types[primaryType]
  const parts: Uint8Array[] = [typeHash(primaryType, types)]
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(data, field.name)) {
      throw new Error(`缺少字段 ${primaryType}.${field.name}`)
    }
    parts.push(encodeValue(field.type, data[field.name], `${primaryType}.${field.name}`, types))
  }
  return concatBytes(...parts)
}

function encodeValue(
  type: string,
  value: EIP712Value,
  fieldName: string,
  types: EIP712Types,
): Uint8Array {
  const am = ARRAY_RE.exec(type)
  if (am) {
    if (!Array.isArray(value)) throw new Error(`${fieldName} 须为数组`)
    const base = am[1]
    if (am[2] !== '' && value.length !== Number(am[2])) {
      throw new Error(`${fieldName} 数组长度须为 ${am[2]}`)
    }
    const elems = value.map((v, i) => encodeValue(base, v, `${fieldName}[${i}]`, types))
    return keccak256(concatBytes(...elems))
  }
  if (isStructType(type, types)) {
    return structHash(baseTypeOf(type), value, types)
  }
  return encodeAtomic(type, value, fieldName)
}

/** structHash = keccak256(encodeData) */
export function structHash(primaryType: string, data: EIP712Value, types: EIP712Types): Uint8Array {
  return keccak256(encodeData(primaryType, data, types))
}

export interface TypedDataInput {
  /** 全部类型声明（含 EIP712Domain） */
  types: EIP712Types
  /** domain 字段值 */
  domain: { [key: string]: EIP712Value }
  /** 消息主类型 */
  primaryType: string
  /** 消息值 */
  message: { [key: string]: EIP712Value }
}

export interface TypedDataResult {
  /** encodeType(primaryType) */
  encodedType: string
  /** typeHash hex */
  typeHashHex: string
  /** domainSeparator hex */
  domainSeparatorHex: string
  /** structHash(message) hex */
  messageHashHex: string
  /** 最终待签名摘要 hex：keccak(0x19 0x01 ‖ domainSeparator ‖ messageHash) */
  digestHex: string
}

/**
 * hashTypedData：EIP-712 完整流程。
 * domain 类型固定为 types['EIP712Domain']（未声明则抛错）。
 */
export function hashTypedData(input: TypedDataInput): TypedDataResult {
  const { types, domain, primaryType, message } = input
  if (!Object.prototype.hasOwnProperty.call(types, 'EIP712Domain')) {
    throw new Error('缺少 EIP712Domain 类型声明')
  }
  const encodedType = encodeType(primaryType, types)
  const typeHashHex = bytesToHex(typeHash(primaryType, types))
  const domainSeparator = structHash('EIP712Domain', domain, types)
  const messageHash = structHash(primaryType, message, types)
  const digest = keccak256(concatBytes(new Uint8Array([0x19, 0x01]), domainSeparator, messageHash))
  return {
    encodedType,
    typeHashHex,
    domainSeparatorHex: bytesToHex(domainSeparator),
    messageHashHex: bytesToHex(messageHash),
    digestHex: bytesToHex(digest),
  }
}
