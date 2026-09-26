import type { MessagePackInput, MessagePackOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class MessagePackError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MessagePackError'
  }
}

const MAX_INPUT = 500_000
/** 嵌套上限：防深递归把主线程打满（本地工具，取一个够用又安全的值） */
const MAX_DEPTH = 64

// —— MessagePack 格式标记（spec 里的第一个字节）——
const NIL = 0xc0
const FALSE = 0xc2
const TRUE = 0xc3
const BIN8 = 0xc4
const BIN16 = 0xc5
const BIN32 = 0xc6
const EXT8 = 0xc7
const EXT16 = 0xc8
const EXT32 = 0xc9
const FLOAT32 = 0xca
const FLOAT64 = 0xcb
const UINT8 = 0xcc
const UINT16 = 0xcd
const UINT32 = 0xce
const UINT64 = 0xcf
const INT8 = 0xd0
const INT16 = 0xd1
const INT32 = 0xd2
const INT64 = 0xd3
const FIXEXT1 = 0xd4
const FIXEXT2 = 0xd5
const FIXEXT4 = 0xd6
const FIXEXT8 = 0xd7
const FIXEXT16 = 0xd8
const STR8 = 0xd9
const STR16 = 0xda
const STR32 = 0xdb
const ARRAY16 = 0xdc
const ARRAY32 = 0xdd
const MAP16 = 0xde
const MAP32 = 0xdf

/** 时间戳扩展类型号（-1 的无符号表示） */
const TIMESTAMP_TYPE = 0xff

// ---------------------------------------------------------------------------
// 字节层
// ---------------------------------------------------------------------------

/** 字节 → 十六进制（小写、无分隔符） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 字节 → 空格分组的十六进制，便于按标记逐段读 */
export function toHexGroups(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += (out ? ' ' : '') + byte.toString(16).padStart(2, '0')
  return out
}

/** 十六进制 → 字节 */
export function fromHex(text: string): Uint8Array {
  const cleaned = text.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length % 2 !== 0) throw new MessagePackError('十六进制字节串长度必须为偶数')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    const pair = cleaned.slice(i * 2, i * 2 + 2)
    const value = Number.parseInt(pair, 16)
    if (Number.isNaN(value)) throw new MessagePackError(`“${pair}”不是合法的十六进制字节`)
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
    if (index === -1) throw new MessagePackError(`“${ch}”不是合法的 base64 字符`)
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
    throw new MessagePackError('解码模式需要字节串（hex 或 base64），不是 JSON')
  }
  if (/^[0-9a-fA-F]+$/.test(compact)) {
    if (compact.length % 2 !== 0) throw new MessagePackError('十六进制字节串长度必须为偶数')
    return fromHex(compact)
  }
  return fromBase64(compact)
}

// ---------------------------------------------------------------------------
// 写入器
// ---------------------------------------------------------------------------

/** 顺序拼字节；所有多字节字段统一大端（MessagePack 是 big-endian） */
class Writer {
  private readonly chunks: number[] = []

  byte(value: number): void {
    this.chunks.push(value & 0xff)
  }

  u16(value: number): void {
    this.byte(value >> 8)
    this.byte(value)
  }

  u32(value: number): void {
    this.byte(value >>> 24)
    this.byte(value >>> 16)
    this.byte(value >>> 8)
    this.byte(value)
  }

  u64(value: bigint): void {
    const big = BigInt.asUintN(64, value)
    for (let shift = 56; shift >= 0; shift -= 8) {
      this.byte(Number((big >> BigInt(shift)) & 0xffn))
    }
  }

  i32(value: number): void {
    this.u32(value >>> 0)
  }

  i64(value: bigint): void {
    this.u64(BigInt.asIntN(64, value))
  }

  f32(value: number): void {
    const bytes = new Uint8Array(4)
    new DataView(bytes.buffer).setFloat32(0, value)
    this.raw(bytes)
  }

  f64(value: number): void {
    const bytes = new Uint8Array(8)
    new DataView(bytes.buffer).setFloat64(0, value)
    this.raw(bytes)
  }

  raw(bytes: Uint8Array): void {
    for (const byte of bytes) this.chunks.push(byte)
  }

  result(): Uint8Array {
    return new Uint8Array(this.chunks)
  }
}

// ---------------------------------------------------------------------------
// 读取器
// ---------------------------------------------------------------------------

class Reader {
  private pos = 0

  constructor(private readonly bytes: Uint8Array) {}

  get done(): boolean {
    return this.pos >= this.bytes.length
  }

  byte(): number {
    if (this.pos >= this.bytes.length) throw new MessagePackError('字节串提前结束')
    const value = this.bytes[this.pos] as number
    this.pos += 1
    return value
  }

  u16(): number {
    return (this.byte() << 8) | this.byte()
  }

  u32(): number {
    return ((this.byte() << 24) | (this.byte() << 16) | (this.byte() << 8) | this.byte()) >>> 0
  }

  u64(): bigint {
    let value = 0n
    for (let i = 0; i < 8; i += 1) value = (value << 8n) | BigInt(this.byte())
    return value
  }

  i8(): number {
    const value = this.byte()
    return value > 0x7f ? value - 0x100 : value
  }

  i16(): number {
    const value = this.u16()
    return value > 0x7fff ? value - 0x10000 : value
  }

  i32(): number {
    const value = this.u32()
    return value > 0x7fffffff ? value - 0x100000000 : value
  }

  i64(): bigint {
    return BigInt.asIntN(64, this.u64())
  }

  f32(): number {
    const slice = this.slice(4)
    return new DataView(slice.buffer, slice.byteOffset, 4).getFloat32(0)
  }

  f64(): number {
    const slice = this.slice(8)
    return new DataView(slice.buffer, slice.byteOffset, 8).getFloat64(0)
  }

  slice(count: number): Uint8Array {
    if (this.pos + count > this.bytes.length) throw new MessagePackError('字节串长度不足')
    const slice = this.bytes.slice(this.pos, this.pos + count)
    this.pos += count
    return slice
  }
}

// ---------------------------------------------------------------------------
// 编码
// ---------------------------------------------------------------------------

/** JSON 里表达「非 JSON 原生类型」的标记（bin / ext / timestamp） */
export const MARKER_KEYS: readonly string[] = ['$bin', '$ext', '$ts']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 编码一个值 */
export function encodeValue(value: unknown, writer: Writer, depth = 0): void {
  if (depth > MAX_DEPTH) throw new MessagePackError('嵌套层级过深（上限 64 层）')

  if (value === null || value === undefined) {
    writer.byte(NIL)
    return
  }
  if (typeof value === 'boolean') {
    writer.byte(value ? TRUE : FALSE)
    return
  }
  if (typeof value === 'number') {
    encodeNumber(value, writer)
    return
  }
  if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value)
    writeStringHeader(bytes.length, writer)
    writer.raw(bytes)
    return
  }
  if (Array.isArray(value)) {
    writeArrayHeader(value.length, writer)
    for (const item of value) encodeValue(item, writer, depth + 1)
    return
  }
  if (isPlainObject(value)) {
    // 只有一个标记键时按特殊类型编码
    const keys = Object.keys(value)
    if (keys.length === 1 && MARKER_KEYS.includes(keys[0] as string)) {
      encodeMarker(keys[0] as string, value, writer)
      return
    }
    writeMapHeader(keys.length, writer)
    for (const key of keys) {
      encodeValue(key, writer, depth + 1)
      encodeValue(value[key], writer, depth + 1)
    }
    return
  }
  throw new MessagePackError(`无法编码的类型：${typeof value}`)
}

function encodeNumber(value: number, writer: Writer): void {
  if (!Number.isFinite(value)) throw new MessagePackError('MessagePack 不能编码 NaN / Infinity')
  if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
    if (value >= 0) {
      if (value < 0x80) {
        writer.byte(value) // positive fixint
        return
      }
      if (value <= 0xff) {
        writer.byte(UINT8)
        writer.byte(value)
        return
      }
      if (value <= 0xffff) {
        writer.byte(UINT16)
        writer.u16(value)
        return
      }
      if (value <= 0xffffffff) {
        writer.byte(UINT32)
        writer.u32(value)
        return
      }
      writer.byte(UINT64)
      writer.u64(BigInt(value))
      return
    }
    if (value >= -32) {
      writer.byte(0xe0 | (value + 32)) // negative fixint
      return
    }
    if (value >= -128) {
      writer.byte(INT8)
      writer.byte(value + 0x100)
      return
    }
    if (value >= -32768) {
      writer.byte(INT16)
      writer.u16(value + 0x10000)
      return
    }
    if (value >= -0x80000000) {
      writer.byte(INT32)
      writer.i32(value)
      return
    }
    writer.byte(INT64)
    writer.i64(BigInt(value))
    return
  }
  writer.byte(FLOAT64)
  writer.f64(value)
}

/** str / bin / array / map 的长度前缀：短长度用 fix 形式省一字节 */
function writeStringHeader(length: number, writer: Writer): void {
  if (length < 32) {
    writer.byte(0xa0 | length)
    return
  }
  if (length <= 0xff) {
    writer.byte(STR8)
    writer.byte(length)
    return
  }
  if (length <= 0xffff) {
    writer.byte(STR16)
    writer.u16(length)
    return
  }
  writer.byte(STR32)
  writer.u32(length)
}

function writeArrayHeader(length: number, writer: Writer): void {
  if (length < 16) {
    writer.byte(0x90 | length)
    return
  }
  if (length <= 0xffff) {
    writer.byte(ARRAY16)
    writer.u16(length)
    return
  }
  writer.byte(ARRAY32)
  writer.u32(length)
}

function writeMapHeader(length: number, writer: Writer): void {
  if (length < 16) {
    writer.byte(0x80 | length)
    return
  }
  if (length <= 0xffff) {
    writer.byte(MAP16)
    writer.u16(length)
    return
  }
  writer.byte(MAP32)
  writer.u32(length)
}

function writeBinHeader(length: number, writer: Writer): void {
  if (length <= 0xff) {
    writer.byte(BIN8)
    writer.byte(length)
    return
  }
  if (length <= 0xffff) {
    writer.byte(BIN16)
    writer.u16(length)
    return
  }
  writer.byte(BIN32)
  writer.u32(length)
}

/** $bin / $ext / $ts 三个标记 */
function encodeMarker(key: string, holder: Record<string, unknown>, writer: Writer): void {
  if (key === '$bin') {
    const bytes = hexToBytes(holder['$bin'], '$bin')
    writeBinHeader(bytes.length, writer)
    writer.raw(bytes)
    return
  }
  if (key === '$ext') {
    const spec = holder['$ext']
    if (!isPlainObject(spec) || typeof spec['type'] !== 'number') {
      throw new MessagePackError('$ext 需要形如 {"type": 1, "data": "0a0b"}')
    }
    const bytes = hexToBytes(spec['data'], '$ext.data')
    const type = signedExtType(spec['type'] as number)
    switch (bytes.length) {
      case 1:
        writer.byte(FIXEXT1)
        break
      case 2:
        writer.byte(FIXEXT2)
        break
      case 4:
        writer.byte(FIXEXT4)
        break
      case 8:
        writer.byte(FIXEXT8)
        break
      case 16:
        writer.byte(FIXEXT16)
        break
      default:
        if (bytes.length <= 0xff) {
          writer.byte(EXT8)
          writer.byte(bytes.length)
        } else if (bytes.length <= 0xffff) {
          writer.byte(EXT16)
          writer.u16(bytes.length)
        } else {
          writer.byte(EXT32)
          writer.u32(bytes.length)
        }
    }
    writer.byte(type)
    writer.raw(bytes)
    return
  }
  // $ts：时间戳（ext type -1）
  // 所有分支都会给 seconds 赋值（else 直接抛错），不设无用初值
  let seconds: bigint
  let nanos = 0n
  const spec = holder['$ts']
  if (typeof spec === 'number') {
    seconds = BigInt(Math.trunc(spec))
  } else if (isPlainObject(spec)) {
    seconds = BigInt(Math.trunc(Number(spec['sec'] ?? 0)))
    nanos = BigInt(Math.trunc(Number(spec['nsec'] ?? 0)))
  } else if (typeof spec === 'string') {
    seconds = BigInt(Math.trunc(Number(spec)))
  } else {
    throw new MessagePackError('$ts 需要秒数，或 {"sec": 1, "nsec": 0}')
  }
  if (!Number.isFinite(Number(seconds)) || !Number.isFinite(Number(nanos))) {
    throw new MessagePackError('$ts 的 sec / nsec 必须是数字')
  }
  if (nanos === 0n && seconds >= 0n && seconds <= 0xffffffffn) {
    writer.byte(FIXEXT4)
    writer.byte(TIMESTAMP_TYPE)
    writer.u32(Number(seconds))
    return
  }
  if (seconds >= 0n && seconds < 0x400000000n && nanos < 1000000000n) {
    const packed = (nanos << 34n) | seconds
    writer.byte(FIXEXT8)
    writer.byte(TIMESTAMP_TYPE)
    writer.u64(packed)
    return
  }
  writer.byte(EXT8)
  writer.byte(12)
  writer.byte(TIMESTAMP_TYPE)
  writer.u32(Number(nanos))
  writer.i64(seconds)
}

/** ext type 存成 1 字节有符号数 */
function signedExtType(type: number): number {
  if (!Number.isInteger(type) || type < -128 || type > 127) {
    throw new MessagePackError('$ext 的 type 必须是 -128 到 127 的整数')
  }
  return type & 0xff
}

function hexToBytes(value: unknown, field: string): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (typeof value === 'string') return fromHex(value)
  throw new MessagePackError(`${field} 需要十六进制字符串`)
}

/** JSON → MessagePack 字节 */
export function encode(value: unknown): Uint8Array {
  const writer = new Writer()
  encodeValue(value, writer)
  return writer.result()
}

// ---------------------------------------------------------------------------
// 解码
// ---------------------------------------------------------------------------

const TYPE_NAMES: Record<number, string> = {
  0xc0: 'nil',
  0xc2: 'bool',
  0xc3: 'bool',
  0xca: 'float',
  0xcb: 'float',
  0xc4: 'bin',
  0xc5: 'bin',
  0xc6: 'bin',
  0xc7: 'ext',
  0xc8: 'ext',
  0xc9: 'ext',
  0xd4: 'ext',
  0xd5: 'ext',
  0xd6: 'ext/timestamp',
  0xd7: 'ext/timestamp',
  0xd8: 'ext',
  0xd9: 'str',
  0xda: 'str',
  0xdb: 'str',
  0xdc: 'array',
  0xdd: 'array',
  0xde: 'map',
  0xdf: 'map',
}

/** 大整数落到 JSON：安全范围内转 number，否则保留字符串，避免精度丢失 */
function bigintToJson(value: bigint): number | string {
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value.toString()
}

/** 解码一个值 */
export function decodeValue(reader: Reader, stats: Record<string, number>, depth = 0): unknown {
  if (depth > MAX_DEPTH) throw new MessagePackError('嵌套层级过深（上限 64 层）')
  const head = reader.byte()
  const name = typeNameOf(head)
  stats[name] = (stats[name] ?? 0) + 1

  if (head <= 0x7f) return head // positive fixint
  if (head >= 0xe0) return head - 0x100 // negative fixint
  if (head >= 0xa0 && head <= 0xbf) return new TextDecoder().decode(reader.slice(head & 0x1f))
  if (head >= 0x90 && head <= 0x9f) return decodeArray(reader, head & 0x0f, stats, depth)
  if (head >= 0x80 && head <= 0x8f) return decodeMap(reader, head & 0x0f, stats, depth)

  switch (head) {
    case NIL:
      return null
    case TRUE:
      return true
    case FALSE:
      return false
    case UINT8:
      return reader.byte()
    case UINT16:
      return reader.u16()
    case UINT32:
      return reader.u32()
    case UINT64:
      return bigintToJson(reader.u64())
    case INT8:
      return reader.i8()
    case INT16:
      return reader.i16()
    case INT32:
      return reader.i32()
    case INT64:
      return bigintToJson(reader.i64())
    case FLOAT32:
      return reader.f32()
    case FLOAT64:
      return reader.f64()
    case STR8:
      return new TextDecoder().decode(reader.slice(reader.byte()))
    case STR16:
      return new TextDecoder().decode(reader.slice(reader.u16()))
    case STR32:
      return new TextDecoder().decode(reader.slice(reader.u32()))
    case BIN8:
      return { $bin: toHex(reader.slice(reader.byte())) }
    case BIN16:
      return { $bin: toHex(reader.slice(reader.u16())) }
    case BIN32:
      return { $bin: toHex(reader.slice(reader.u32())) }
    case ARRAY16:
      return decodeArray(reader, reader.u16(), stats, depth)
    case ARRAY32:
      return decodeArray(reader, reader.u32(), stats, depth)
    case MAP16:
      return decodeMap(reader, reader.u16(), stats, depth)
    case MAP32:
      return decodeMap(reader, reader.u32(), stats, depth)
    case EXT8:
      return decodeExt(reader, reader.byte(), stats)
    case EXT16:
      return decodeExt(reader, reader.u16(), stats)
    case EXT32:
      return decodeExt(reader, reader.u32(), stats)
    case FIXEXT1:
      return decodeExt(reader, 1, stats)
    case FIXEXT2:
      return decodeExt(reader, 2, stats)
    case FIXEXT4:
      return decodeExt(reader, 4, stats)
    case FIXEXT8:
      return decodeExt(reader, 8, stats)
    case FIXEXT16:
      return decodeExt(reader, 16, stats)
    default:
      throw new MessagePackError(`未知的 MessagePack 标记 0x${head.toString(16).padStart(2, '0')}`)
  }
}

/** 第一个字节 → 统计用类型名 */
function typeNameOf(head: number): string {
  if (head <= 0x7f || head >= 0xe0) return 'int'
  if (head >= 0xa0 && head <= 0xbf) return 'str'
  if (head >= 0x90 && head <= 0x9f) return 'array'
  if (head >= 0x80 && head <= 0x8f) return 'map'
  if (head >= 0xcc && head <= 0xd3) return 'int'
  return TYPE_NAMES[head] ?? 'unknown'
}

function decodeArray(
  reader: Reader,
  length: number,
  stats: Record<string, number>,
  depth: number,
): unknown[] {
  const out: unknown[] = []
  for (let i = 0; i < length; i += 1) out.push(decodeValue(reader, stats, depth + 1))
  return out
}

function decodeMap(
  reader: Reader,
  length: number,
  stats: Record<string, number>,
  depth: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (let i = 0; i < length; i += 1) {
    const key = decodeValue(reader, stats, depth + 1)
    out[String(key)] = decodeValue(reader, stats, depth + 1)
  }
  return out
}

/** ext：type -1 且长度合法时按 timestamp 解释，其余保留原始字节 */
function decodeExt(reader: Reader, length: number, stats: Record<string, number>): unknown {
  const type = reader.byte()
  const data = reader.slice(length)
  if (type === TIMESTAMP_TYPE && (length === 4 || length === 8 || length === 12)) {
    stats['timestamp'] = (stats['timestamp'] ?? 0) + 1
    if (length === 4) {
      const seconds = new DataView(data.buffer, data.byteOffset, 4).getUint32(0)
      return { $ts: { sec: seconds, nsec: 0 } }
    }
    if (length === 8) {
      const packed = new DataView(data.buffer, data.byteOffset, 8).getBigUint64(0)
      return { $ts: { sec: Number(packed & 0x3ffffffffn), nsec: Number(packed >> 34n) } }
    }
    const view = new DataView(data.buffer, data.byteOffset, 12)
    return { $ts: { nsec: view.getUint32(0), sec: Number(view.getBigInt64(4)) } }
  }
  return { $ext: { type: type > 0x7f ? type - 0x100 : type, data: toHex(data) } }
}

/** MessagePack 字节 → 值 + 类型统计（顺带统计每个类型出现了多少次） */
export function decode(bytes: Uint8Array): { value: unknown; counts: Record<string, number> } {
  const reader = new Reader(bytes)
  const counts: Record<string, number> = {}
  const value = decodeValue(reader, counts)
  if (!reader.done) {
    throw new MessagePackError('字节串里还有多余内容（只解出了第一个值）')
  }
  return { value, counts }
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

/** 统计表渲染：按出现次数降序 */
function renderStats(counts: Record<string, number>): string {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return rows.map(([name, count]) => `  ${name}: ${count}`).join('\n')
}

/**
 * MessagePack 编解码（纯函数）。
 * 编码走 JSON + 三个标记键；解码输出规整 JSON 并附类型统计。
 */
export function transform(input: MessagePackInput, options: MessagePackOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new MessagePackError('输入超过 500,000 字符上限')

  if (options.mode === 'decode') {
    const bytes = parseByteString(input.text)
    if (bytes.length === 0) throw new MessagePackError('请输入 MessagePack 字节串（hex 或 base64）')
    const { value, counts } = decode(bytes)
    return [
      '# MessagePack 解码',
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
    throw new MessagePackError('不是合法的 JSON（编码模式需要 JSON）')
  }
  const bytes = encode(value)
  const preview = JSON.stringify(decode(bytes).value, null, 2)
  const encoded = options.format === 'base64' ? toBase64(bytes) : toHex(bytes)
  return [
    '# MessagePack 编码',
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
