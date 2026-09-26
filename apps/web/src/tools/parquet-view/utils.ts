import type { ParquetViewInput, ParquetViewOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class ParquetViewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParquetViewError'
  }
}

/** 上传文件体积上限：30 MiB（本工具只读尾部页脚，仍对整体大小设个上限） */
export const MAX_FILE_BYTES = 30 * 1024 * 1024

const MAGIC = 0x31524150 // 'PAR1' 的小端整数

// ————————————————————————————————————————————————————————————
// Thrift Compact Protocol（RFC 风格的最小解码，只覆盖读 Parquet 页脚所需）
// https://github.com/apache/thrift/blob/master/doc/specs/thrift-compact-protocol.md
// ————————————————————————————————————————————————————————————

const CT_STOP = 0
const CT_BOOLEAN_TRUE = 1
const CT_BOOLEAN_FALSE = 2
const CT_BYTE = 3
const CT_I16 = 4
const CT_I32 = 5
const CT_I64 = 6
const CT_DOUBLE = 7
const CT_BINARY = 8
const CT_LIST = 9
const CT_SET = 10
const CT_MAP = 11
const CT_STRUCT = 12

class CompactReader {
  private offset = 0

  constructor(private readonly data: Uint8Array) {}

  get done(): boolean {
    return this.offset >= this.data.length
  }

  /** 无符号 LEB128 varint */
  readVarint(): number {
    let result = 0
    let shift = 0
    for (;;) {
      const byte = this.data[this.offset]
      if (byte === undefined) throw new ParquetViewError('Thrift varint 读取越界')
      this.offset += 1
      result |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) break
      shift += 7
      if (shift > 63) throw new ParquetViewError('Thrift varint 过长')
    }
    // 用无符号右移保证非负；超过 2^53 的 i64 会丢精度，但页脚字段用不到
    return result >>> 0
  }

  /** zigzag 有符号整数 */
  readZigzag(): number {
    const n = this.readVarint()
    return (n >>> 1) ^ -(n & 1)
  }

  private readByte(): number {
    const byte = this.data[this.offset]
    if (byte === undefined) throw new ParquetViewError('Thrift 读取越界')
    this.offset += 1
    return byte
  }

  private readBinary(): string {
    const length = this.readVarint()
    const start = this.offset
    this.offset += length
    if (this.offset > this.data.length) throw new ParquetViewError('Thrift binary 读取越界')
    return new TextDecoder('utf-8').decode(this.data.subarray(start, this.offset))
  }

  private readDouble(): number {
    const start = this.offset
    this.offset += 8
    const view = new DataView(this.data.buffer, this.data.byteOffset + start, 8)
    return view.getFloat64(0, true)
  }

  private readList(): unknown[] {
    const header = this.readByte()
    let size = header >> 4
    const elemType = header & 0x0f
    if (size === 15) size = this.readVarint()
    const out: unknown[] = []
    for (let i = 0; i < size; i += 1) out.push(this.readValue(elemType))
    return out
  }

  private readMap(): Array<{ key: unknown; value: unknown }> {
    const size = this.readVarint()
    if (size === 0) return []
    const kv = this.readByte()
    const keyType = kv >> 4
    const valueType = kv & 0x0f
    const out: Array<{ key: unknown; value: unknown }> = []
    for (let i = 0; i < size; i += 1) {
      out.push({ key: this.readValue(keyType), value: this.readValue(valueType) })
    }
    return out
  }

  /** 读一个 struct，返回 fieldId → 值 */
  readStruct(): Map<number, unknown> {
    const fields = new Map<number, unknown>()
    let previousId = 0
    for (;;) {
      const header = this.readByte()
      if (header === CT_STOP) break
      const delta = header >> 4
      const type = header & 0x0f
      let id: number
      if (delta !== 0) {
        id = previousId + delta
      } else {
        id = this.readZigzag()
      }
      previousId = id
      fields.set(id, this.readValue(type))
    }
    return fields
  }

  private readValue(type: number): unknown {
    switch (type) {
      case CT_BOOLEAN_TRUE:
        return true
      case CT_BOOLEAN_FALSE:
        return false
      case CT_BYTE:
        // i8 有符号
        return (this.readByte() << 24) >> 24
      case CT_I16:
      case CT_I32:
      case CT_I64:
        return this.readZigzag()
      case CT_DOUBLE:
        return this.readDouble()
      case CT_BINARY:
        return this.readBinary()
      case CT_LIST:
      case CT_SET:
        return this.readList()
      case CT_MAP:
        return this.readMap()
      case CT_STRUCT:
        return this.readStruct()
      default:
        throw new ParquetViewError(`不支持的 Thrift compact 类型：${type}`)
    }
  }
}

// ————————————————————————————————————————————————————————————
// Parquet 语义层
// ————————————————————————————————————————————————————————————

/** parquet.thrift Type（物理类型） */
const PHYSICAL_TYPES: Record<number, string> = {
  0: 'BOOLEAN',
  1: 'INT32',
  2: 'INT64',
  3: 'INT96（时间戳，旧）',
  4: 'FLOAT',
  5: 'DOUBLE',
  6: 'BYTE_ARRAY',
  7: 'FIXED_LEN_BYTE_ARRAY',
}

/** parquet.thrift FieldRepetitionType */
const REPETITION_TYPES: Record<number, string> = {
  0: 'required',
  1: 'optional',
  2: 'repeated',
}

/** parquet.thrift ConvertedType（常见项） */
const CONVERTED_TYPES: Record<number, string> = {
  0: 'UTF8',
  1: 'MAP',
  2: 'MAP_KEY_VALUE',
  3: 'LIST',
  4: 'ENUM',
  5: 'DECIMAL',
  6: 'DATE',
  7: 'TIME_MILLIS',
  8: 'TIME_MICROS',
  9: 'TIMESTAMP_MILLIS',
  10: 'TIMESTAMP_MICROS',
  11: 'UINT_32',
  12: 'UINT_64',
  13: 'INT_32',
  14: 'INT_64',
  15: 'JSON',
  16: 'BSON',
}

export interface SchemaNode {
  readonly name: string
  readonly physicalType?: string
  readonly repetition?: string
  readonly convertedType?: string
  readonly typeLength?: number
  readonly children: SchemaNode[]
}

export interface ParquetMetadata {
  readonly version: number
  readonly numRows: number
  readonly rowGroupCount: number
  readonly createdBy?: string
  readonly root: SchemaNode
  readonly columnCount: number
  readonly keyValue: Readonly<Record<string, string>>
}

function asMap(value: unknown): Map<number, unknown> {
  return value instanceof Map ? (value as Map<number, unknown>) : new Map<number, unknown>()
}

/** FileMetaData（field: 1 version, 2 schema, 3 num_rows, 4 row_groups, 5 kv, 6 created_by） */
export function parseFileMetadata(bytes: Uint8Array): ParquetMetadata {
  const root = new CompactReader(bytes).readStruct()

  const version = (root.get(1) as number | undefined) ?? 0
  const numRows = (root.get(3) as number | undefined) ?? 0
  const schemaRaw = (root.get(2) as unknown[] | undefined) ?? []
  const rowGroups = (root.get(4) as unknown[] | undefined) ?? []
  const createdBy = root.get(6) as string | undefined
  const kvRaw = (root.get(5) as unknown[] | undefined) ?? []

  const elements = schemaRaw.map((item) => asMap(item))
  const { root: schemaRoot, columnCount } = buildSchemaTree(elements)

  const keyValue: Record<string, string> = {}
  for (const entry of kvRaw) {
    const m = asMap(entry)
    const key = m.get(1)
    const val = m.get(2)
    if (typeof key === 'string') keyValue[key] = typeof val === 'string' ? val : ''
  }

  return {
    version,
    numRows,
    rowGroupCount: rowGroups.length,
    createdBy,
    root: schemaRoot,
    columnCount,
    keyValue,
  }
}

/**
 * Parquet schema 是 preorder 扁平数组：父节点带 num_children。
 * 用栈重建为树。
 */
export function buildSchemaTree(elements: readonly Map<number, unknown>[]): {
  root: SchemaNode
  columnCount: number
} {
  if (elements.length === 0) {
    throw new ParquetViewError('页脚 schema 为空，不是有效的 Parquet 文件')
  }

  let index = 0
  let columnCount = 0

  const build = (depth: number): SchemaNode => {
    const fields = elements[index]
    if (!fields) throw new ParquetViewError('schema 元素数量与 num_children 不一致')
    index += 1

    const name = (fields.get(4) as string | undefined) ?? '(unnamed)'
    const physicalCode = fields.get(1) as number | undefined
    const repetitionCode = fields.get(3) as number | undefined
    const convertedCode = fields.get(6) as number | undefined
    const typeLength = fields.get(2) as number | undefined
    const numChildren = (fields.get(5) as number | undefined) ?? 0

    const node: SchemaNode = {
      name,
      physicalType: physicalCode !== undefined ? PHYSICAL_TYPES[physicalCode] : undefined,
      repetition: repetitionCode !== undefined ? REPETITION_TYPES[repetitionCode] : undefined,
      convertedType: convertedCode !== undefined ? CONVERTED_TYPES[convertedCode] : undefined,
      typeLength,
      children: [],
    }
    if (depth > 0) columnCount += 1

    const children: SchemaNode[] = []
    for (let i = 0; i < numChildren; i += 1) children.push(build(depth + 1))
    return { ...node, children }
  }

  const rootNode = build(0)
  return { root: rootNode, columnCount }
}

/** 校验文件并从尾部定位 FileMetaData 字节 */
export function locateFooter(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 12) {
    throw new ParquetViewError('文件过小（少于 12 字节），不可能是 Parquet')
  }
  const head = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true)
  if (head !== MAGIC) {
    throw new ParquetViewError('文件头不是 PAR1，不是 Parquet 文件（可能是别的格式或已损坏）')
  }
  const tailStart = bytes.length - 4
  const tail = new DataView(bytes.buffer, bytes.byteOffset + tailStart, 4).getUint32(0, true)
  if (tail !== MAGIC) {
    throw new ParquetViewError('文件尾不是 PAR1，不是完整的 Parquet 文件')
  }
  const footerLength = new DataView(bytes.buffer, bytes.byteOffset + bytes.length - 8, 4).getUint32(
    0,
    true,
  )
  const footerStart = bytes.length - 8 - footerLength
  if (footerLength <= 0 || footerStart < 4) {
    throw new ParquetViewError('页脚长度字段非法，文件可能已损坏')
  }
  return bytes.subarray(footerStart, bytes.length - 8)
}

/** 文件字节 → 元数据 */
export function parseParquet(bytes: Uint8Array): ParquetMetadata {
  return parseFileMetadata(locateFooter(bytes))
}

function renderSchemaTree(node: SchemaNode, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth)
  const parts: string[] = [node.name]
  const typeParts: string[] = []
  if (node.repetition) typeParts.push(node.repetition)
  if (node.physicalType) {
    let t = node.physicalType
    if (node.physicalType === 'FIXED_LEN_BYTE_ARRAY' && node.typeLength !== undefined) {
      t += `(${node.typeLength})`
    }
    typeParts.push(t)
  }
  if (node.convertedType) typeParts.push(`→ ${node.convertedType}`)
  parts.push(typeParts.join(' '))
  lines.push(`${indent}- ${parts.filter(Boolean).join('：')}`)
  for (const child of node.children) renderSchemaTree(child, depth + 1, lines)
}

/** 元数据 → 中文 Markdown 报告 */
export function renderMetadata(meta: ParquetMetadata): string {
  const lines: string[] = ['# Parquet 元数据', '']
  lines.push(`Parquet 版本：${meta.version}`)
  lines.push(`总行数：${meta.numRows.toLocaleString('en-US')}`)
  lines.push(`Row group 数：${meta.rowGroupCount}`)
  lines.push(`叶子列数：${meta.columnCount}`)
  if (meta.createdBy) lines.push(`生成工具：${meta.createdBy}`)

  const kvEntries = Object.entries(meta.keyValue)
  if (kvEntries.length > 0) {
    lines.push('', '## 自定义键值', '')
    for (const [key, value] of kvEntries) lines.push(`- ${key}: ${value}`)
  }

  lines.push('', '## Schema', '')
  const treeLines: string[] = []
  renderSchemaTree(meta.root, 0, treeLines)
  lines.push(...treeLines)

  lines.push('', '> 仅展示页脚元数据，不读取 / 解压列数据值。')
  return lines.join('\n')
}

/** 文件字节入口（Tool.tsx 读取后调用） */
export function transformBytes(bytes: Uint8Array): string {
  if (bytes.length > MAX_FILE_BYTES) {
    throw new ParquetViewError('文件超过 30 MiB 上限')
  }
  return renderMetadata(parseParquet(bytes))
}

/**
 * 文本入口不承载 Parquet（二进制无法粘贴）。
 * 保留以满足 TwoColumn 的 run 契约：空文本返回空串，其余提示改用文件上传。
 */
export function transform(input: ParquetViewInput, _options: ParquetViewOptions): string {
  if (!input.text || input.text.trim() === '') return ''
  throw new ParquetViewError('Parquet 是二进制文件，请使用「上传文件」入口选择 .parquet 文件')
}
