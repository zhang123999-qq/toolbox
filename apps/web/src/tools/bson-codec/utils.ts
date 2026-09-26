import type { BsonCodecInput, BsonCodecOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class BsonCodecError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BsonCodecError'
  }
}

const MAX_INPUT = 500_000
/** 嵌套上限：BSON 可以无限嵌套，这里给一个安全阈值 */
const MAX_DEPTH = 64

/** 本工具支持的 BSON 元素类型（其余见 README「限制」） */
export const ELEMENT_TYPES: Record<number, string> = {
  0x01: 'double',
  0x02: 'string',
  0x03: 'document',
  0x04: 'array',
  0x05: 'binary',
  0x07: 'objectId',
  0x08: 'boolean',
  0x09: 'datetime',
  0x0a: 'null',
  0x10: 'int32',
  0x12: 'int64',
}

const TYPE_DOUBLE = 0x01
const TYPE_STRING = 0x02
const TYPE_DOCUMENT = 0x03
const TYPE_ARRAY = 0x04
const TYPE_BINARY = 0x05
const TYPE_OBJECT_ID = 0x07
const TYPE_BOOLEAN = 0x08
const TYPE_DATETIME = 0x09
const TYPE_NULL = 0x0a
const TYPE_INT32 = 0x10
const TYPE_INT64 = 0x12

/** ObjectId 的二进制子类型（用于 binary 子类型展示） */
const SUBTYPE_UUID = 0x04

/** JSON 里表达 BSON 专有类型的标记键 */
const MARKER_KEYS: readonly string[] = [
  '$oid',
  '$date',
  '$numberLong',
  '$numberInt',
  '$numberDouble',
  '$binary',
]

// ---------------------------------------------------------------------------
// 字节层
// ---------------------------------------------------------------------------

/** 字节 → 十六进制（小写、无分隔符） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 字节 → 空格分组的十六进制 */
export function toHexGroups(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += (out ? ' ' : '') + byte.toString(16).padStart(2, '0')
  return out
}

/** 十六进制 → 字节 */
export function fromHex(text: string): Uint8Array {
  const cleaned = text.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length % 2 !== 0) throw new BsonCodecError('十六进制字节串长度必须为偶数')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    const pair = cleaned.slice(i * 2, i * 2 + 2)
    const value = Number.parseInt(pair, 16)
    if (Number.isNaN(value)) throw new BsonCodecError(`“${pair}”不是合法的十六进制字节`)
    bytes[i] = value
  }
  return bytes
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 字节 → base64（手写，不依赖 btoa，保持 utils 与 DOM 无关） */
export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] as number
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out += B64_ALPHABET[b0 >> 2]
    out += B64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]
    out += b1 === undefined ? '=' : B64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]
    out += b2 === undefined ? '=' : B64_ALPHABET[b2 & 0x3f]
  }
  return out
}

/** base64 → 字节 */
export function fromBase64(text: string): Uint8Array {
  const cleaned = text.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const values: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of cleaned) {
    if (ch === '=') break
    const index = B64_ALPHABET.indexOf(ch)
    if (index === -1) throw new BsonCodecError(`“${ch}”不是合法的 base64 字符`)
    buffer = (buffer << 6) | index
    bits += 6
    if (bits >= 8) {
      bits -= 8
      values.push((buffer >> bits) & 0xff)
    }
  }
  return new Uint8Array(values)
}

/** 字节串输入：纯十六进制按 hex 解，否则按 base64 解 */
export function parseByteString(text: string): Uint8Array {
  const compact = text.trim().replace(/\s+/g, '')
  if (compact === '') return new Uint8Array(0)
  if (compact.startsWith('{') || compact.startsWith('[')) {
    throw new BsonCodecError('解码模式需要字节串（hex 或 base64），不是 JSON')
  }
  if (/^[0-9a-fA-F]+$/.test(compact)) {
    if (compact.length % 2 !== 0) throw new BsonCodecError('十六进制字节串长度必须为偶数')
    return fromHex(compact)
  }
  return fromBase64(compact)
}

// ---------------------------------------------------------------------------
// 编码
// ---------------------------------------------------------------------------

/** BSON 一律小端（与 MongoDB 的 wire protocol 一致） */
class Writer {
  private readonly chunks: number[] = []

  byte(value: number): void {
    this.chunks.push(value & 0xff)
  }

  i32(value: number): void {
    const view = new DataView(new ArrayBuffer(4))
    view.setInt32(0, value, true)
    this.raw(new Uint8Array(view.buffer))
  }

  i64(value: bigint): void {
    const view = new DataView(new ArrayBuffer(8))
    view.setBigInt64(0, value, true)
    this.raw(new Uint8Array(view.buffer))
  }

  f64(value: number): void {
    const view = new DataView(new ArrayBuffer(8))
    view.setFloat64(0, value, true)
    this.raw(new Uint8Array(view.buffer))
  }

  raw(bytes: Uint8Array): void {
    for (const byte of bytes) this.chunks.push(byte)
  }

  /** cstring：UTF-8 字节 + 结尾 0x00 */
  cstring(text: string): void {
    this.raw(new TextEncoder().encode(text))
    this.byte(0)
  }

  result(): Uint8Array {
    return new Uint8Array(this.chunks)
  }

  get length(): number {
    return this.chunks.length
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 转 BigInt：字符串直接按十进制解析，避免先过 Number 丢掉 2^53 以上的精度
 * （`$numberLong: "9007199254740993"` 经 Number 会变成 ...992）。
 */
function toBigInt(value: unknown, marker: string): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return BigInt(value.trim())
  throw new BsonCodecError(`${marker} 需要整数或整数字符串`)
}

/** 编码一个文档（不含开头的总长度） */
function encodeElements(value: Record<string, unknown>, writer: Writer, depth: number): void {
  if (depth > MAX_DEPTH) throw new BsonCodecError('嵌套层级过深（上限 64 层）')
  for (const [key, item] of Object.entries(value)) {
    if (key.includes('\0')) throw new BsonCodecError('BSON 字段名不能包含空字节')
    writer.byte(typeOf(key, item))
    writer.cstring(key)
    encodeValue(item, writer, depth)
  }
  // 结尾的 0x00 由调用方写：顶层与嵌套文档的长度计算都包含它
}

/**
 * 值 → BSON 类型号。
 * 规则：带标记键的走专有类型；整数落 int32；其余数字落 double。
 */
function typeOf(key: string, value: unknown): number {
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && MARKER_KEYS.includes(keys[0] as string)) {
      const marker = keys[0] as string
      if (marker === '$oid') return TYPE_OBJECT_ID
      if (marker === '$date') return TYPE_DATETIME
      if (marker === '$numberLong') return TYPE_INT64
      if (marker === '$binary') return TYPE_BINARY
      return TYPE_DOUBLE
    }
    return TYPE_DOCUMENT
  }
  if (Array.isArray(value)) return TYPE_ARRAY
  if (value === null || value === undefined) return TYPE_NULL
  if (typeof value === 'boolean') return TYPE_BOOLEAN
  if (typeof value === 'string') return TYPE_STRING
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff
      ? TYPE_INT32
      : TYPE_DOUBLE
  }
  throw new BsonCodecError(`字段“${key}”的类型（${typeof value}）不支持编码为 BSON`)
}

function encodeValue(value: unknown, writer: Writer, depth: number): void {
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    const marker = keys.length === 1 && MARKER_KEYS.includes(keys[0] as string) ? keys[0] : null
    if (marker === '$oid') {
      const oid = value['$oid']
      if (typeof oid !== 'string' || !/^[0-9a-fA-F]{24}$/.test(oid)) {
        throw new BsonCodecError('$oid 需要 24 位十六进制字符串')
      }
      writer.raw(fromHex(oid))
      return
    }
    if (marker === '$date') {
      writer.i64(toBigInt(value['$date'], '$date'))
      return
    }
    if (marker === '$numberLong' || marker === '$numberInt' || marker === '$numberDouble') {
      const raw = value[marker as string]
      if (marker === '$numberLong') {
        writer.i64(toBigInt(raw, '$numberLong'))
        return
      }
      const numeric = Number(raw)
      if (!Number.isFinite(numeric)) throw new BsonCodecError(`${marker} 需要数字或数字字符串`)
      if (marker === '$numberInt') writer.i32(Math.trunc(numeric))
      else writer.f64(numeric)
      return
    }
    if (marker === '$binary') {
      const spec = value['$binary']
      if (!isPlainObject(spec) || typeof spec['data'] !== 'string') {
        throw new BsonCodecError('$binary 需要形如 {"subType": 0, "data": "0a0b"}')
      }
      const bytes = fromHex(spec['data'] as string)
      const subType = typeof spec['subType'] === 'number' ? (spec['subType'] as number) : 0
      writer.i32(bytes.length)
      writer.byte(subType)
      writer.raw(bytes)
      return
    }
    // 普通嵌套文档：先编码内容，再回填长度
    const nested = new Writer()
    encodeElements(value, nested, depth + 1)
    writer.i32(nested.length + 5)
    writer.raw(nested.result())
    writer.byte(0)
    return
  }

  if (Array.isArray(value)) {
    const nested = new Writer()
    encodeElements(arrayToDocument(value), nested, depth + 1)
    writer.i32(nested.length + 5)
    writer.raw(nested.result())
    writer.byte(0)
    return
  }

  if (value === null || value === undefined) return
  if (typeof value === 'boolean') {
    writer.byte(value ? 1 : 0)
    return
  }
  if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value)
    writer.i32(bytes.length + 1)
    writer.raw(bytes)
    writer.byte(0)
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new BsonCodecError('BSON 不能编码 NaN / Infinity')
    if (Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff) {
      writer.i32(value)
      return
    }
    writer.f64(value)
  }
}

/** 数组在 BSON 里就是「键为 0、1、2… 的文档」 */
function arrayToDocument(value: readonly unknown[]): Record<string, unknown> {
  const document: Record<string, unknown> = {}
  value.forEach((item, index) => {
    document[String(index)] = item
  })
  return document
}

/** JSON 值 → BSON 字节（顶层必须是文档） */
export function encode(value: unknown): Uint8Array {
  if (!isPlainObject(value)) throw new BsonCodecError('顶层必须是 JSON 对象（BSON 文档）')
  const body = new Writer()
  encodeElements(value, body, 0)
  const total = body.length + 5 // int32 长度 + 元素 + 结尾 0x00
  const writer = new Writer()
  writer.i32(total)
  writer.raw(body.result())
  writer.byte(0)
  return writer.result()
}

// ---------------------------------------------------------------------------
// 解码
// ---------------------------------------------------------------------------

class Reader {
  private pos = 0

  constructor(private readonly bytes: Uint8Array) {}

  byte(): number {
    if (this.pos >= this.bytes.length) throw new BsonCodecError('字节串提前结束')
    const value = this.bytes[this.pos] as number
    this.pos += 1
    return value
  }

  i32(): number {
    const slice = this.slice(4)
    return new DataView(slice.buffer, slice.byteOffset, 4).getInt32(0, true)
  }

  i64(): bigint {
    const slice = this.slice(8)
    return new DataView(slice.buffer, slice.byteOffset, 8).getBigInt64(0, true)
  }

  f64(): number {
    const slice = this.slice(8)
    return new DataView(slice.buffer, slice.byteOffset, 8).getFloat64(0, true)
  }

  slice(count: number): Uint8Array {
    if (this.pos + count > this.bytes.length) throw new BsonCodecError('字节串长度不足')
    const slice = this.bytes.slice(this.pos, this.pos + count)
    this.pos += count
    return slice
  }

  /** cstring：读到 0x00 为止 */
  cstring(): string {
    let end = this.pos
    while (end < this.bytes.length && (this.bytes[end] as number) !== 0) end += 1
    if (end >= this.bytes.length) throw new BsonCodecError('字符串没有以空字节结尾')
    const slice = this.bytes.slice(this.pos, end)
    this.pos = end + 1
    return new TextDecoder().decode(slice)
  }

  /** 长度前缀的 string：int32（含结尾 0）+ cstring */
  string(): string {
    const length = this.i32()
    if (length < 1) throw new BsonCodecError('字符串长度不合法')
    const bytes = this.slice(length - 1)
    if (this.byte() !== 0) throw new BsonCodecError('字符串没有以空字节结尾')
    return new TextDecoder().decode(bytes)
  }

  get done(): boolean {
    return this.pos >= this.bytes.length
  }
}

/** 解码一个文档（已读过开头的总长度） */
function decodeDocument(
  reader: Reader,
  counts: Record<string, number>,
  depth: number,
  asArray: boolean,
): unknown {
  if (depth > MAX_DEPTH) throw new BsonCodecError('嵌套层级过深（上限 64 层）')
  const document: Record<string, unknown> = {}
  while (true) {
    const type = reader.byte()
    if (type === 0) break
    const name = ELEMENT_TYPES[type]
    if (!name) {
      throw new BsonCodecError(
        `不支持的 BSON 元素类型 0x${type.toString(16).padStart(2, '0')}（见 README「限制」）`,
      )
    }
    counts[name] = (counts[name] ?? 0) + 1
    const key = reader.cstring()
    document[key] = decodeValue(type, reader, counts, depth)
  }
  if (!asArray) return document
  return Object.keys(document)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => document[key])
}

function decodeValue(
  type: number,
  reader: Reader,
  counts: Record<string, number>,
  depth: number,
): unknown {
  switch (type) {
    case TYPE_DOUBLE:
      return reader.f64()
    case TYPE_STRING:
      return reader.string()
    case TYPE_DOCUMENT: {
      const length = reader.i32()
      if (length < 5) throw new BsonCodecError('嵌套文档长度不合法')
      return decodeDocument(reader, counts, depth + 1, false)
    }
    case TYPE_ARRAY: {
      const length = reader.i32()
      if (length < 5) throw new BsonCodecError('数组长度不合法')
      return decodeDocument(reader, counts, depth + 1, true)
    }
    case TYPE_BINARY: {
      const length = reader.i32()
      const subType = reader.byte()
      const data = reader.slice(length)
      return { $binary: { subType, data: toHex(data), note: subTypeName(subType) } }
    }
    case TYPE_OBJECT_ID:
      return { $oid: toHex(reader.slice(12)) }
    case TYPE_BOOLEAN:
      return reader.byte() !== 0
    case TYPE_DATETIME:
      // 毫秒时间戳可能超过 2^53？实际不会，但大数值仍保留数字便于 JSON 化
      return { $date: Number(reader.i64()) }
    case TYPE_NULL:
      return null
    case TYPE_INT32:
      return reader.i32()
    case TYPE_INT64:
      // 64 位整数用字符串承载，避免 JSON 里丢精度
      return { $numberLong: reader.i64().toString() }
    default:
      throw new BsonCodecError(`不支持的 BSON 元素类型 0x${type.toString(16).padStart(2, '0')}`)
  }
}

/** binary 子类型的可读说明 */
function subTypeName(subType: number): string {
  if (subType === 0) return 'generic'
  if (subType === 0x02) return 'old-binary'
  if (subType === SUBTYPE_UUID) return 'uuid'
  if (subType === 0x80) return 'user-defined'
  return 'unknown'
}

/** BSON 字节 → 值 + 类型统计 */
export function decode(bytes: Uint8Array): { value: unknown; counts: Record<string, number> } {
  if (bytes.length < 5) throw new BsonCodecError('BSON 至少需要 5 字节')
  const reader = new Reader(bytes)
  const declared = reader.i32()
  if (declared !== bytes.length) {
    throw new BsonCodecError(
      `BSON 声明长度 ${declared} 与实际字节数 ${bytes.length} 不一致（可能是片段而非完整文档）`,
    )
  }
  const counts: Record<string, number> = {}
  const value = decodeDocument(reader, counts, 0, false)
  if (!reader.done) throw new BsonCodecError('字节串里还有多余内容')
  return { value, counts }
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

function renderStats(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `  ${name}: ${count}`)
    .join('\n')
}

/**
 * BSON 编解码（纯函数）：只覆盖日常数据里最常见的 11 种元素类型。
 * 未覆盖的类型在解码时直接报错并提示类型号，避免悄悄产出错误结果。
 */
export function transform(input: BsonCodecInput, options: BsonCodecOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new BsonCodecError('输入超过 500,000 字符上限')

  if (options.mode === 'decode') {
    const bytes = parseByteString(input.text)
    if (bytes.length === 0) throw new BsonCodecError('请输入 BSON 字节串（hex 或 base64）')
    const { value, counts } = decode(bytes)
    return [
      '# BSON 解码',
      '',
      JSON.stringify(value, null, 2),
      '',
      '类型统计：',
      renderStats(counts),
      '',
      `字节数: ${bytes.length}`,
    ].join('\n')
  }

  let value: unknown
  try {
    value = JSON.parse(input.text)
  } catch {
    throw new BsonCodecError('不是合法的 JSON（编码模式需要 JSON 对象）')
  }
  if (!isPlainObject(value)) throw new BsonCodecError('顶层必须是 JSON 对象（BSON 文档）')
  const bytes = encode(value)
  const preview = JSON.stringify(decode(bytes).value, null, 2)
  const encoded = options.format === 'base64' ? toBase64(bytes) : toHex(bytes)
  return [
    '# BSON 编码',
    '',
    `${options.format === 'base64' ? 'base64' : 'hex   '}: ${encoded}`,
    `字节数: ${bytes.length}`,
    '',
    '分组视图：',
    `  ${toHexGroups(bytes)}`,
    '',
    '解码回读（JSON 预览）：',
    preview,
  ].join('\n')
}
