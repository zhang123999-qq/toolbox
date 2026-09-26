import type { ProtobufCodecInput, ProtobufCodecOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class ProtobufCodecError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProtobufCodecError'
  }
}

const MAX_INPUT = 200_000

/** varint 编码的数值类型 */
const VARINT_TYPES: readonly string[] = [
  'int32',
  'int64',
  'uint32',
  'uint64',
  'sint32',
  'sint64',
  'bool',
]
/** 64 位定长类型 */
const FIXED64_TYPES: readonly string[] = ['fixed64', 'sfixed64', 'double']
/** 32 位定长类型 */
const FIXED32_TYPES: readonly string[] = ['fixed32', 'sfixed32', 'float']
/** 长度前缀类型 */
const LENGTH_TYPES: readonly string[] = ['string', 'bytes']

const WIRE_NAME: Record<number, string> = {
  0: 'varint',
  1: '64-bit',
  2: 'length-delimited',
  5: '32-bit',
}

// ---------------------------------------------------------------------------
// 字节层：hex / base64 / varint / zigzag（全部自己实现，不引第三方库）
// ---------------------------------------------------------------------------

/** 字节 → 十六进制（小写、无分隔符） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 字节 → 空格分组的十六进制，供逐字段明细阅读 */
export function toHexGroups(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += (out ? ' ' : '') + byte.toString(16).padStart(2, '0')
  return out
}

/** 十六进制 → 字节；允许空格 / 0x 前缀 */
export function fromHex(text: string): Uint8Array {
  const cleaned = text.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length % 2 !== 0) throw new ProtobufCodecError('十六进制字节串长度必须为偶数')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    const pair = cleaned.slice(i * 2, i * 2 + 2)
    const value = Number.parseInt(pair, 16)
    if (Number.isNaN(value)) throw new ProtobufCodecError(`“${pair}”不是合法的十六进制字节`)
    bytes[i] = value
  }
  return bytes
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 字节 → base64：手写而非用 btoa，保持 utils 与 DOM 无关 */
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

/** base64 → 字节；容忍空白与 URL-safe 字符 */
export function fromBase64(text: string): Uint8Array {
  const cleaned = text.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const values: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of cleaned) {
    if (ch === '=') break
    const index = B64_ALPHABET.indexOf(ch)
    if (index === -1) throw new ProtobufCodecError(`“${ch}”不是合法的 base64 字符`)
    buffer = (buffer << 6) | index
    bits += 6
    if (bits >= 8) {
      bits -= 8
      values.push((buffer >> bits) & 0xff)
    }
  }
  return new Uint8Array(values)
}

/** 无符号整数 → varint 字节（protobuf 的小端 7 位分组） */
export function varintBytes(value: bigint): Uint8Array {
  const out: number[] = []
  let rest = value < 0n ? BigInt.asUintN(64, value) : value
  while (rest >= 0x80n) {
    out.push(Number(rest & 0x7fn) | 0x80)
    rest >>= 7n
  }
  out.push(Number(rest))
  return new Uint8Array(out)
}

/** zigzag：把 -1 映射成 1、1 映射成 2，让负数也能用短 varint 表示 */
export function zigzagEncode(value: bigint): bigint {
  return value >= 0n ? value << 1n : (value << 1n) ^ -1n
}

/** zigzag 还原 */
export function zigzagDecode(value: bigint): bigint {
  return value & 1n ? ~(value >> 1n) : value >> 1n
}

/** tag = (字段号 << 3) | wire type */
export function tagBytes(fieldNumber: number, wireType: number): Uint8Array {
  return varintBytes((BigInt(fieldNumber) << 3n) | BigInt(wireType))
}

/** 拼接多段字节 */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

// ---------------------------------------------------------------------------
// .proto 解析
// ---------------------------------------------------------------------------

export type FieldKind = 'varint' | 'fixed64' | 'fixed32' | 'length' | 'message' | 'enum' | 'map'

export interface ProtoField {
  readonly name: string
  readonly type: string
  readonly number: number
  readonly label: 'singular' | 'repeated' | 'optional' | 'required'
  readonly kind: FieldKind
  readonly wireType: number
  /** map<K, V> 的键值类型；非 map 字段为 undefined */
  readonly mapKey?: string
  readonly mapValue?: string
}

export interface ProtoMessage {
  readonly name: string
  readonly fields: readonly ProtoField[]
}

export interface ProtoEnumValue {
  readonly name: string
  readonly number: number
}

export interface ProtoEnum {
  readonly name: string
  readonly values: readonly ProtoEnumValue[]
}

export interface ProtoDocument {
  readonly syntax: string
  readonly packageName: string
  readonly messages: readonly ProtoMessage[]
  readonly enums: readonly ProtoEnum[]
  readonly warnings: readonly string[]
}

interface Token {
  readonly kind: 'name' | 'number' | 'string' | 'punct'
  readonly value: string
}

/** 词法分析：先剥掉注释，再切成 name / number / string / 标点四类 token */
function tokenize(source: string): readonly Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i] as string
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i)
      i = newline === -1 ? source.length : newline + 1
      continue
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
      continue
    }
    if (ch === '"') {
      const end = source.indexOf('"', i + 1)
      if (end === -1) throw new ProtobufCodecError('字符串没有闭合')
      tokens.push({ kind: 'string', value: source.slice(i + 1, end) })
      i = end + 1
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(i))
      tokens.push({ kind: 'name', value: (match as RegExpExecArray)[0] })
      i += (match as RegExpExecArray)[0].length
      continue
    }
    if (/[0-9-]/.test(ch)) {
      const match = /^-?[0-9][0-9a-fA-FxX.]*/.exec(source.slice(i))
      tokens.push({ kind: 'number', value: (match as RegExpExecArray)[0] })
      i += (match as RegExpExecArray)[0].length
      continue
    }
    if ('{}();=<>,[]'.includes(ch)) {
      tokens.push({ kind: 'punct', value: ch })
      i += 1
      continue
    }
    throw new ProtobufCodecError(`无法识别的字符“${ch}”`)
  }
  return tokens
}

/** 类型名 → 字段种类与 wire type；文件内未定义的自定义类型按嵌套消息处理 */
function resolveType(
  type: string,
  messages: readonly ProtoMessage[],
  enums: readonly ProtoEnum[],
  warnings: string[],
): { kind: FieldKind; wireType: number } {
  if (VARINT_TYPES.includes(type)) return { kind: 'varint', wireType: 0 }
  if (FIXED64_TYPES.includes(type)) return { kind: 'fixed64', wireType: 1 }
  if (FIXED32_TYPES.includes(type)) return { kind: 'fixed32', wireType: 5 }
  if (LENGTH_TYPES.includes(type)) return { kind: 'length', wireType: 2 }
  if (enums.some((item) => item.name === type || item.name.endsWith('.' + type))) {
    return { kind: 'enum', wireType: 0 }
  }
  if (!messages.some((item) => item.name === type || item.name.endsWith('.' + type))) {
    warnings.push(`类型“${type}”未在文件内定义，按嵌套消息处理`)
  }
  return { kind: 'message', wireType: 2 }
}

/** 递归下降解析 .proto */
class ProtoParser {
  private pos = 0

  constructor(private readonly tokens: readonly Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private next(): Token | undefined {
    const token = this.tokens[this.pos]
    this.pos += 1
    return token
  }

  private expectPunct(value: string): void {
    const token = this.next()
    if (!token || token.kind !== 'punct' || token.value !== value) {
      throw new ProtobufCodecError(`期望“${value}”，实际读到“${token?.value ?? '文件末尾'}”`)
    }
  }

  private expectName(): string {
    const token = this.next()
    if (!token || token.kind !== 'name') {
      throw new ProtobufCodecError(`期望一个名称，实际读到“${token?.value ?? '文件末尾'}”`)
    }
    return token.value
  }

  /** 字段号必须 ≥ 1；枚举值允许 0，故用 allowZero 区分 */
  private expectNumber(allowZero = false): number {
    const token = this.next()
    if (!token || token.kind !== 'number') {
      throw new ProtobufCodecError(`期望一个数字，实际读到“${token?.value ?? '文件末尾'}”`)
    }
    const value = Number.parseInt(token.value, 10)
    if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
      throw new ProtobufCodecError(`数字“${token.value}”不是合法的正整数`)
    }
    return value
  }

  /** 跳到下一个分号（option / reserved / import 之类的声明） */
  private skipStatement(): void {
    while (this.peek() && !(this.peek() as Token).value.includes(';')) {
      const token = this.peek() as Token
      if (token.kind === 'punct' && token.value === ';') break
      this.next()
    }
    if (this.peek()?.value === ';') this.next()
  }

  /** 跳过一整个花括号块（service / extend） */
  private skipBlock(): void {
    this.expectPunct('{')
    let depth = 1
    while (depth > 0) {
      const token = this.next()
      if (!token) throw new ProtobufCodecError('花括号块没有闭合')
      if (token.kind === 'punct' && token.value === '{') depth += 1
      if (token.kind === 'punct' && token.value === '}') depth -= 1
    }
  }

  parseDocument(): ProtoDocument {
    let syntax = 'proto2'
    let packageName = ''
    const messages: ProtoMessage[] = []
    const enums: ProtoEnum[] = []
    const warnings: string[] = []

    while (this.peek()) {
      const head = this.peek() as Token
      if (head.kind === 'punct' && head.value === ';') {
        this.next()
        continue
      }
      if (head.kind !== 'name') {
        throw new ProtobufCodecError(`无法识别的顶层声明“${head.value}”`)
      }
      switch (head.value) {
        case 'syntax': {
          this.next()
          this.expectPunct('=')
          const token = this.next()
          if (!token || token.kind !== 'string') {
            throw new ProtobufCodecError('syntax 后面必须是字符串（如 "proto3"）')
          }
          syntax = token.value
          this.expectPunct(';')
          break
        }
        case 'package': {
          this.next()
          packageName = this.expectName()
          this.expectPunct(';')
          break
        }
        case 'import':
        case 'option':
          this.next()
          this.skipStatement()
          break
        case 'message': {
          this.next()
          const name = this.expectName()
          this.parseMessageBody(scopeOf(packageName, name), messages, enums, warnings)
          break
        }
        case 'enum': {
          this.next()
          const name = this.expectName()
          enums.push(this.parseEnumBody(scopeOf(packageName, name)))
          break
        }
        case 'service':
        case 'extend':
          this.next()
          this.expectName()
          this.skipBlock()
          break
        default:
          throw new ProtobufCodecError(`无法识别的顶层声明“${head.value}”`)
      }
    }

    return { syntax, packageName, messages, enums, warnings }
  }

  private parseMessageBody(
    fullName: string,
    messages: ProtoMessage[],
    enums: ProtoEnum[],
    warnings: string[],
  ): void {
    this.expectPunct('{')
    const fields: ProtoField[] = []
    messages.push({ name: fullName, fields })

    while (this.peek()) {
      const head = this.peek() as Token
      if (head.kind === 'punct' && head.value === ';') {
        this.next()
        continue
      }
      if (head.kind === 'punct' && head.value === '}') {
        this.next()
        messages[messages.length - 1] = { name: fullName, fields }
        return
      }
      if (head.kind !== 'name') {
        throw new ProtobufCodecError(`message ${fullName} 里出现无法识别的内容“${head.value}”`)
      }
      switch (head.value) {
        case 'reserved':
        case 'option':
        case 'extensions':
          this.next()
          this.skipStatement()
          break
        case 'message': {
          this.next()
          const name = this.expectName()
          this.parseMessageBody(fullName + '.' + name, messages, enums, warnings)
          break
        }
        case 'enum': {
          this.next()
          const name = this.expectName()
          enums.push(this.parseEnumBody(fullName + '.' + name))
          break
        }
        case 'oneof': {
          // oneof 展开为普通字段：本工具不做「互斥」语义检查
          this.next()
          this.expectName()
          this.expectPunct('{')
          this.parseFieldsUntilBrace(fullName, messages, enums, warnings, fields)
          break
        }
        case 'map': {
          this.next()
          this.expectPunct('<')
          const keyType = this.expectName()
          this.expectPunct(',')
          const valueType = this.expectName()
          this.expectPunct('>')
          const fieldName = this.expectName()
          this.expectPunct('=')
          const number = this.expectNumber()
          this.skipFieldOptions()
          fields.push({
            name: fieldName,
            type: `map<${keyType}, ${valueType}>`,
            number,
            label: 'repeated',
            kind: 'map',
            wireType: 2,
            mapKey: keyType,
            mapValue: valueType,
          })
          break
        }
        default:
          this.parseFieldsUntilBrace(fullName, messages, enums, warnings, fields, 1)
      }
    }
    throw new ProtobufCodecError(`message ${fullName} 没有闭合`)
  }

  /** 解析字段直到遇到 `}`（oneof 内部）或只解析一条字段（普通字段） */
  private parseFieldsUntilBrace(
    fullName: string,
    messages: readonly ProtoMessage[],
    enums: readonly ProtoEnum[],
    warnings: string[],
    fields: ProtoField[],
    limit = Infinity,
  ): void {
    let parsed = 0
    while (parsed < limit) {
      const token = this.peek()
      if (!token) throw new ProtobufCodecError(`message ${fullName} 没有闭合`)
      if (token.kind === 'punct' && token.value === ';') {
        this.next()
        continue
      }
      if (token.kind === 'punct' && token.value === '}') {
        this.next()
        return
      }
      fields.push(this.parseField(fullName, messages, enums, warnings))
      parsed += 1
    }
  }

  private parseField(
    fullName: string,
    messages: readonly ProtoMessage[],
    enums: readonly ProtoEnum[],
    warnings: string[],
  ): ProtoField {
    let label: ProtoField['label'] = 'singular'
    let typeToken = this.next()
    if (
      typeToken?.kind === 'name' &&
      ['repeated', 'optional', 'required'].includes(typeToken.value)
    ) {
      label = typeToken.value as ProtoField['label']
      typeToken = this.next()
    }
    if (!typeToken || typeToken.kind !== 'name') {
      throw new ProtobufCodecError(
        `message ${fullName} 的字段类型无法识别（读到“${typeToken?.value ?? '文件末尾'}”）`,
      )
    }
    const type = typeToken.value
    const name = this.expectName()
    this.expectPunct('=')
    const number = this.expectNumber()
    this.skipFieldOptions()
    const resolved = resolveType(type, messages, enums, warnings)
    return { name, type, number, label, kind: resolved.kind, wireType: resolved.wireType }
  }

  /** 跳过 `[deprecated = true]` 之类的字段选项 */
  private skipFieldOptions(): void {
    if (this.peek()?.value === '[') {
      while (this.peek() && (this.peek() as Token).value !== ']') this.next()
      this.expectPunct(']')
    }
    if (this.peek()?.value === ';') this.next()
  }

  private parseEnumBody(fullName: string): ProtoEnum {
    this.expectPunct('{')
    const values: ProtoEnumValue[] = []
    while (this.peek()) {
      const token = this.peek() as Token
      if (token.kind === 'punct' && token.value === ';') {
        this.next()
        continue
      }
      if (token.kind === 'punct' && token.value === '}') {
        this.next()
        return { name: fullName, values }
      }
      if (token.kind !== 'name') {
        throw new ProtobufCodecError(`enum ${fullName} 里出现无法识别的内容“${token.value}”`)
      }
      const name = this.expectName()
      this.expectPunct('=')
      const number = this.expectNumber(true)
      values.push({ name, number })
      if (this.peek()?.value === ';') this.next()
    }
    throw new ProtobufCodecError(`enum ${fullName} 没有闭合`)
  }
}

function scopeOf(packageName: string, name: string): string {
  return packageName ? `${packageName}.${name}` : name
}

/** 解析 .proto 文本；语法错误抛 ProtobufCodecError */
export function parseProto(source: string): ProtoDocument {
  return new ProtoParser(tokenize(source)).parseDocument()
}

/** 按名字找 message：支持全名与短名（末尾匹配） */
export function findMessage(document: ProtoDocument, name: string): ProtoMessage | undefined {
  return (
    document.messages.find((message) => message.name === name) ??
    document.messages.find((message) => message.name.endsWith('.' + name))
  )
}

/** 按名字找 enum */
export function findEnum(document: ProtoDocument, name: string): ProtoEnum | undefined {
  return (
    document.enums.find((item) => item.name === name) ??
    document.enums.find((item) => item.name.endsWith('.' + name))
  )
}

// ---------------------------------------------------------------------------
// 编码演示：把「手工输入的字段值」按 message 定义打成字节
// ---------------------------------------------------------------------------

export interface EncodedField {
  readonly number: number
  readonly name: string
  readonly type: string
  readonly shown: string
  readonly bytes: Uint8Array
}

/** 值 → BigInt：数字 / 数字字符串都收，别的一律报错（中文提示） */
function toBigInt(value: unknown, field: string): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'boolean') return value ? 1n : 0n
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new ProtobufCodecError(`字段“${field}”需要整数，实际是 ${value}`)
    }
    return BigInt(value)
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return BigInt(value.trim())
  }
  throw new ProtobufCodecError(`字段“${field}”的值必须是整数或整数字符串`)
}

function toNumber(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  throw new ProtobufCodecError(`字段“${field}”的值必须是数字`)
}

/** bytes 字段：收十六进制字符串或数字数组 */
function toBytes(value: unknown, field: string): Uint8Array {
  if (Array.isArray(value)) {
    for (const byte of value) {
      if (typeof byte !== 'number' || byte < 0 || byte > 255) {
        throw new ProtobufCodecError(`字段“${field}”的字节数组里存在非 0–255 的值`)
      }
    }
    return new Uint8Array(value as number[])
  }
  if (typeof value === 'string') return fromHex(value)
  throw new ProtobufCodecError(`字段“${field}”需要十六进制字符串或字节数组`)
}

/** 有符号整数按 64 位补码落盘（protobuf 的负数表示法） */
function toTwos(value: bigint): bigint {
  return value < 0n ? BigInt.asUintN(64, value) : value
}

/** 编码单个字段值（不含 tag） */
function encodeValue(
  document: ProtoDocument,
  field: ProtoField,
  value: unknown,
  depth: number,
): Uint8Array {
  if (depth > 8) throw new ProtobufCodecError('嵌套层级过深（上限 8 层）')
  switch (field.kind) {
    case 'varint': {
      const big = toBigInt(value, field.name)
      return varintBytes(field.type.startsWith('sint') ? zigzagEncode(big) : toTwos(big))
    }
    case 'enum': {
      if (typeof value === 'string') {
        const enumDef = findEnum(document, field.type)
        const hit = enumDef?.values.find((item) => item.name === value)
        if (!hit) throw new ProtobufCodecError(`枚举 ${field.type} 里没有值“${value}”`)
        return varintBytes(BigInt(hit.number))
      }
      return varintBytes(toTwos(toBigInt(value, field.name)))
    }
    case 'fixed64': {
      if (field.type === 'double') {
        const bytes = new Uint8Array(8)
        new DataView(bytes.buffer).setFloat64(0, toNumber(value, field.name), true)
        return bytes
      }
      const big = toTwos(toBigInt(value, field.name))
      const bytes = new Uint8Array(8)
      new DataView(bytes.buffer).setBigUint64(0, big, true)
      return bytes
    }
    case 'fixed32': {
      const bytes = new Uint8Array(4)
      if (field.type === 'float') {
        new DataView(bytes.buffer).setFloat32(0, toNumber(value, field.name), true)
        return bytes
      }
      const big = toTwos(toBigInt(value, field.name))
      new DataView(bytes.buffer).setUint32(0, Number(big & 0xffffffffn), true)
      return bytes
    }
    case 'length': {
      if (field.type === 'bytes') return toBytes(value, field.name)
      if (typeof value !== 'string') {
        throw new ProtobufCodecError(`字段“${field.name}”需要字符串`)
      }
      return new TextEncoder().encode(value)
    }
    case 'message': {
      const nested = findMessage(document, field.type)
      if (!nested) throw new ProtobufCodecError(`找不到 message“${field.type}”的定义`)
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new ProtobufCodecError(`字段“${field.name}”需要对象（${field.type} 的字段值）`)
      }
      return encodeMessageBytes(document, nested, value as Record<string, unknown>, depth + 1)
    }
    case 'map': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new ProtobufCodecError(`字段“${field.name}”需要对象（map 的键值对）`)
      }
      const keyField = makeField('key', field.mapKey as string, 1, document)
      const valueField = makeField('value', field.mapValue as string, 2, document)
      const parts: Uint8Array[] = []
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        const entry = concat([
          encodeField(document, keyField, coerceMapKey(key, field.mapKey as string), depth + 1),
          encodeField(document, valueField, item, depth + 1),
        ])
        parts.push(tagBytes(field.number, 2), varintBytes(BigInt(entry.length)), entry)
      }
      return concat(parts)
    }
    default:
      throw new ProtobufCodecError(`类型“${field.type}”暂不支持编码`)
  }
}

/** 造一个只用于编码的临时字段定义（map 的 key / value） */
function makeField(
  name: string,
  type: string,
  number: number,
  document: ProtoDocument,
): ProtoField {
  const resolved = resolveType(type, document.messages, document.enums, [])
  return { name, type, number, label: 'singular', kind: resolved.kind, wireType: resolved.wireType }
}

/** map 的 key 从 JSON 的对象键（字符串）还原成声明的类型 */
function coerceMapKey(key: string, type: string): unknown {
  if (type === 'bool') return key === 'true'
  if (['int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64'].includes(type)) return BigInt(key)
  if (['fixed32', 'sfixed32', 'fixed64', 'sfixed64', 'float', 'double'].includes(type)) {
    return Number(key)
  }
  return key
}

/** 编码「tag + 值」；length-delimited 的两类（string/bytes/message）要再补长度前缀 */
function encodeField(
  document: ProtoDocument,
  field: ProtoField,
  value: unknown,
  depth: number,
): Uint8Array {
  const tag = tagBytes(field.number, field.wireType)
  const payload = encodeValue(document, field, value, depth)
  // map 的每个 entry 自带 tag 与长度，不能再包一层
  if (field.kind === 'map') return payload
  if (field.wireType === 2) {
    return concat([tag, varintBytes(BigInt(payload.length)), payload])
  }
  return concat([tag, payload])
}

/** 值 → 展示文本（明细行里用） */
function showValue(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'string') return `"${value}"`
  if (value === null || value === undefined) return 'null'
  return JSON.stringify(value)
}

/** 把整个 message 的字段值打成字节，并给出逐字段明细 */
export function encodeMessage(
  document: ProtoDocument,
  message: ProtoMessage,
  values: Record<string, unknown>,
  startDepth = 0,
): { bytes: Uint8Array; fields: readonly EncodedField[] } {
  const unknown = Object.keys(values).filter(
    (key) => !message.fields.some((field) => field.name === key),
  )
  if (unknown.length) {
    throw new ProtobufCodecError(`message ${message.name} 里没有字段：${unknown.join('、')}`)
  }
  const parts: Uint8Array[] = []
  const details: EncodedField[] = []
  // 按字段号输出，保证同一份输入每次得到同样的字节
  for (const field of [...message.fields].sort((a, b) => a.number - b.number)) {
    if (!(field.name in values)) continue
    const value = values[field.name]
    if (field.label === 'repeated') {
      if (!Array.isArray(value)) {
        throw new ProtobufCodecError(`字段“${field.name}”是 repeated，需要数组`)
      }
      for (const item of value) {
        const bytes = encodeField(document, field, item, startDepth)
        parts.push(bytes)
        details.push({
          number: field.number,
          name: field.name,
          type: field.type,
          shown: showValue(item),
          bytes,
        })
      }
      continue
    }
    const bytes = encodeField(document, field, value, startDepth)
    parts.push(bytes)
    details.push({
      number: field.number,
      name: field.name,
      type: field.type,
      shown: showValue(value),
      bytes,
    })
  }
  return { bytes: concat(parts), fields: details }
}

/** 只取字节，供嵌套消息递归调用；透传当前深度以让 >8 层的嵌套守卫生效 */
function encodeMessageBytes(
  document: ProtoDocument,
  message: ProtoMessage,
  values: Record<string, unknown>,
  depth: number,
): Uint8Array {
  return encodeMessage(document, message, values, depth).bytes
}

// ---------------------------------------------------------------------------
// 解码演示：按 message 定义把字节还原成字段
// ---------------------------------------------------------------------------

export interface DecodedField {
  readonly number: number
  readonly name: string
  readonly type: string
  readonly wireType: number
  readonly value: unknown
}

class ByteReader {
  private pos = 0

  constructor(private readonly bytes: Uint8Array) {}

  get done(): boolean {
    return this.pos >= this.bytes.length
  }

  readVarint(): bigint {
    let result = 0n
    let shift = 0n
    while (true) {
      if (this.pos >= this.bytes.length) throw new ProtobufCodecError('字节串在 varint 中间结束')
      const byte = this.bytes[this.pos] as number
      this.pos += 1
      result |= BigInt(byte & 0x7f) << shift
      if ((byte & 0x80) === 0) return result
      shift += 7n
      if (shift > 70n) throw new ProtobufCodecError('varint 过长（超过 10 字节）')
    }
  }

  readBytes(count: number): Uint8Array {
    if (this.pos + count > this.bytes.length) {
      throw new ProtobufCodecError('字节串长度不足')
    }
    const slice = this.bytes.slice(this.pos, this.pos + count)
    this.pos += count
    return slice
  }
}

/** varint → 有符号整数（32 / 64 位补码还原） */
function fromTwos(value: bigint, bits: number): bigint {
  return BigInt.asIntN(bits, value)
}

/** bigint → JSON 友好值：安全范围内转 number，否则保留字符串（int64 常见） */
function toJsonNumber(value: bigint): number | string {
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value.toString()
}

/** 按定义解码一段字节 */
export function decodeMessage(
  document: ProtoDocument,
  message: ProtoMessage,
  bytes: Uint8Array,
  depth = 0,
): { value: Record<string, unknown>; fields: readonly DecodedField[] } {
  if (depth > 8) throw new ProtobufCodecError('嵌套层级过深（上限 8 层）')
  const reader = new ByteReader(bytes)
  const value: Record<string, unknown> = {}
  const fields: DecodedField[] = []

  while (!reader.done) {
    const key = reader.readVarint()
    const fieldNumber = Number(key >> 3n)
    const wireType = Number(key & 7n)
    const field = message.fields.find((item) => item.number === fieldNumber)

    if (!field) {
      // 未知字段：按 wire type 跳过，明细里标出来（真实 protobuf 也会保留未知字段）
      const raw = skipUnknown(reader, wireType)
      fields.push({
        number: fieldNumber,
        name: '(未知字段)',
        type: WIRE_NAME[wireType] ?? String(wireType),
        wireType,
        value: toHex(raw),
      })
      continue
    }

    if (field.kind === 'map') {
      const size = Number(reader.readVarint())
      const entryBytes = reader.readBytes(size)
      const keyField = makeField('key', field.mapKey as string, 1, document)
      const valueField = makeField('value', field.mapValue as string, 2, document)
      const entry = decodeMessage(
        document,
        { name: field.type, fields: [keyField, valueField] },
        entryBytes,
        depth + 1,
      ).value
      const mapKey = String(entry['key'] ?? '')
      const container = (value[field.name] as Record<string, unknown> | undefined) ?? {}
      container[mapKey] = entry['value'] ?? null
      value[field.name] = container
      fields.push({
        number: fieldNumber,
        name: `${field.name}[${mapKey}]`,
        type: field.type,
        wireType,
        value: entry['value'] ?? null,
      })
      continue
    }

    const decoded = decodeValue(document, field, reader, depth)
    if (field.label === 'repeated') {
      const list = (value[field.name] as unknown[] | undefined) ?? []
      list.push(decoded)
      value[field.name] = list
    } else {
      value[field.name] = decoded
    }
    fields.push({
      number: fieldNumber,
      name: field.name,
      type: field.type,
      wireType,
      value: decoded,
    })
  }

  return { value, fields }
}

/** 按 wire type 跳过不认识的字段 */
function skipUnknown(reader: ByteReader, wireType: number): Uint8Array {
  switch (wireType) {
    case 0:
      return varintBytes(reader.readVarint())
    case 1:
      return reader.readBytes(8)
    case 2: {
      const size = Number(reader.readVarint())
      return reader.readBytes(size)
    }
    case 5:
      return reader.readBytes(4)
    default:
      throw new ProtobufCodecError(`不支持的 wire type ${wireType}（group 已废弃）`)
  }
}

function decodeValue(
  document: ProtoDocument,
  field: ProtoField,
  reader: ByteReader,
  depth: number,
): unknown {
  switch (field.kind) {
    case 'varint': {
      const raw = reader.readVarint()
      if (field.type === 'bool') return raw !== 0n
      if (field.type.startsWith('sint')) return toJsonNumber(zigzagDecode(raw))
      if (field.type === 'int32' || field.type === 'sint32') {
        return toJsonNumber(fromTwos(raw, 32))
      }
      return toJsonNumber(fromTwos(raw, 64))
    }
    case 'enum': {
      const raw = reader.readVarint()
      const enumDef = findEnum(document, field.type)
      const hit = enumDef?.values.find((item) => BigInt(item.number) === raw)
      return hit ? hit.name : toJsonNumber(raw)
    }
    case 'fixed64': {
      const slice = reader.readBytes(8)
      if (field.type === 'double')
        return new DataView(slice.buffer, slice.byteOffset, 8).getFloat64(0, true)
      const raw = new DataView(slice.buffer, slice.byteOffset, 8).getBigUint64(0, true)
      return field.type === 'sfixed64' ? toJsonNumber(fromTwos(raw, 64)) : toJsonNumber(raw)
    }
    case 'fixed32': {
      const slice = reader.readBytes(4)
      const view = new DataView(slice.buffer, slice.byteOffset, 4)
      if (field.type === 'float') return view.getFloat32(0, true)
      const raw = BigInt(view.getUint32(0, true))
      return field.type === 'sfixed32' ? toJsonNumber(fromTwos(raw, 32)) : toJsonNumber(raw)
    }
    case 'length': {
      const size = Number(reader.readVarint())
      const slice = reader.readBytes(size)
      if (field.type === 'bytes') return toHex(slice)
      return new TextDecoder().decode(slice)
    }
    case 'message': {
      const size = Number(reader.readVarint())
      const slice = reader.readBytes(size)
      const nested = findMessage(document, field.type)
      if (!nested) throw new ProtobufCodecError(`找不到 message“${field.type}”的定义`)
      return decodeMessage(document, nested, slice, depth + 1).value
    }
    default:
      throw new ProtobufCodecError(`类型“${field.type}”暂不支持解码`)
  }
}

// ---------------------------------------------------------------------------
// 输出渲染
// ---------------------------------------------------------------------------

/** 结构预览：把 message / enum 的骨架与 wire type 打出来 */
export function renderStructure(document: ProtoDocument): string {
  const lines: string[] = ['# Protobuf 结构预览', `syntax: ${document.syntax}`]
  if (document.packageName) lines.push(`package: ${document.packageName}`)
  lines.push('')

  for (const message of document.messages) {
    const depth = message.name.split('.').length - (document.packageName ? 1 : 0)
    const pad = '  '.repeat(Math.max(0, depth - 1))
    lines.push(`${pad}message ${shortName(message.name, document.packageName)} {`)
    for (const field of [...message.fields].sort((a, b) => a.number - b.number)) {
      const label = field.label === 'singular' ? '' : field.label + ' '
      const decl = `${pad}  ${label}${field.type} ${field.name} = ${field.number};`
      lines.push(
        `${decl.padEnd(Math.min(72, decl.length + 2))}// wire ${field.wireType} (${WIRE_NAME[field.wireType] ?? '?'})`,
      )
    }
    lines.push(`${pad}}`)
    lines.push('')
  }

  for (const item of document.enums) {
    lines.push(`enum ${shortName(item.name, document.packageName)} {`)
    for (const value of item.values) lines.push(`  ${value.name} = ${value.number};`)
    lines.push('}')
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

function shortName(fullName: string, packageName: string): string {
  return packageName && fullName.startsWith(packageName + '.')
    ? fullName.slice(packageName.length + 1)
    : fullName
}

/**
 * 主入口。
 * 只做「结构解析 + 编码 / 解码演示」：不是完整的 protobuf 运行时，
 * 没有 packed 重复字段、没有 unknown field 保留策略、也不处理 proto2 默认值。
 */
export function transform(input: ProtobufCodecInput, options: ProtobufCodecOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new ProtobufCodecError('输入超过 200,000 字符上限')
  if (input.values.length > MAX_INPUT) throw new ProtobufCodecError('字段值超过 200,000 字符上限')

  const document = parseProto(input.text)
  const warnings = [...document.warnings]

  if (options.mode === 'structure') {
    return withWarnings(renderStructure(document), warnings)
  }

  const target = options.target.trim()
  const message = target
    ? findMessage(document, target)
    : (document.messages.find((item) => item.fields.length > 0) ?? document.messages[0])
  if (!message) {
    throw new ProtobufCodecError(
      target ? `找不到 message“${target}”` : '.proto 里没有 message 定义',
    )
  }

  if (options.mode === 'encode') {
    if (!input.values.trim()) {
      return withWarnings(renderStructure(document), [
        ...warnings,
        '未填写字段值，先展示结构；在「字段值」里填 JSON 对象即可编码',
      ])
    }
    let values: unknown
    try {
      values = JSON.parse(input.values)
    } catch {
      throw new ProtobufCodecError('字段值不是合法的 JSON（编码模式需要 JSON 对象）')
    }
    if (values === null || typeof values !== 'object' || Array.isArray(values)) {
      throw new ProtobufCodecError('字段值必须是 JSON 对象，例如 {"id": 1, "name": "a"}')
    }
    const { bytes, fields } = encodeMessage(document, message, values as Record<string, unknown>)
    const lines: string[] = [
      `# 编码演示（message ${shortName(message.name, document.packageName)}）`,
      '字段明细（tag + 值）：',
    ]
    for (const field of fields) {
      lines.push(`  ${field.number} ${field.name} (${field.type}) = ${field.shown}`)
      lines.push(`      ${toHexGroups(field.bytes)}`)
    }
    lines.push('')
    lines.push(
      options.format === 'base64' ? `base64: ${toBase64(bytes)}` : `hex:    ${toHex(bytes)}`,
    )
    lines.push(`字节数: ${bytes.length}`)
    return withWarnings(lines.join('\n'), warnings)
  }

  // decode
  if (!input.values.trim()) {
    return withWarnings(renderStructure(document), [
      ...warnings,
      '未填写字节串，先展示结构；在「字段值」里填 hex 或 base64 即可解码',
    ])
  }
  const bytes = parseByteString(input.values)
  const { value, fields } = decodeMessage(document, message, bytes)
  const lines: string[] = [
    `# 解码演示（message ${shortName(message.name, document.packageName)}）`,
    '字段明细：',
  ]
  for (const field of fields) {
    lines.push(`  ${field.number} ${field.name} (${field.type}) = ${JSON.stringify(field.value)}`)
  }
  lines.push('')
  lines.push(JSON.stringify(value, null, 2))
  lines.push('')
  lines.push(`字节数: ${bytes.length}`)
  return withWarnings(lines.join('\n'), warnings)
}

/** 字节串输入：十六进制优先，否则按 base64 解 */
export function parseByteString(text: string): Uint8Array {
  const compact = text.trim().replace(/\s+/g, '')
  if (compact === '') return new Uint8Array(0)
  if (compact.startsWith('{') || compact.startsWith('[')) {
    throw new ProtobufCodecError('解码模式需要字节串（hex 或 base64），不是 JSON')
  }
  if (/^[0-9a-fA-F]+$/.test(compact) && compact.length % 2 === 0) return fromHex(compact)
  if (/^[0-9a-fA-F]+$/.test(compact)) {
    throw new ProtobufCodecError('十六进制字节串长度必须为偶数')
  }
  return fromBase64(compact)
}

/** 把告警注释插到输出头部 */
function withWarnings(body: string, warnings: readonly string[]): string {
  if (warnings.length === 0) return body
  return [...new Set(warnings).values()].map((item) => `# ${item}`).join('\n') + '\n\n' + body
}
