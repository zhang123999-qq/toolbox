import type { SqliteViewerInput, SqliteViewerOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class SqliteViewerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SqliteViewerError'
  }
}

/** 上传文件体积上限：30 MiB */
export const MAX_FILE_BYTES = 30 * 1024 * 1024

const HEADER_MAGIC = 'SQLite format 3\u0000'
const DB_HEADER_SIZE = 100

export interface MasterRow {
  readonly type: string // table / view / index / trigger
  readonly name: string
  readonly tableName: string
  readonly rootPage: number
  readonly sql: string | null
}

export interface SqliteInfo {
  readonly pageSize: number
  readonly pageCount: number
  readonly fileSize: number
  readonly reservedBytes: number
  readonly encoding: string
  readonly readVersion: number
  readonly writeVersion: number
  readonly objects: readonly MasterRow[]
  readonly skippedOverflow: number
}

function beUint16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1]
}

function beUint32(data: Uint8Array, offset: number): number {
  return (
    (data[offset] * 0x1000000 +
      (data[offset + 1] << 16) +
      (data[offset + 2] << 8) +
      data[offset + 3]) >>>
    0
  )
}

/** SQLite 变长整数（big-endian，最多 9 字节）；返回 [值, 消耗字节数] */
function readVarint(data: Uint8Array, start: number): [number, number] {
  let result = 0
  for (let i = 0; i < 8; i += 1) {
    const byte = data[start + i]
    if (byte === undefined) throw new SqliteViewerError('varint 读取越界')
    result = (result << 7) | (byte & 0x7f)
    if ((byte & 0x80) === 0) return [result, i + 1]
  }
  // 第 9 字节整体使用
  const ninth = data[start + 8]
  if (ninth === undefined) throw new SqliteViewerError('varint 读取越界')
  // 超过 2^53 会丢精度，但 rowid / 长度在此规模内够用
  return [(result * 256 + ninth) >>> 0, 9]
}

/** 页号 → 该页 b-tree 头起始下标（第 1 页前有 100 字节数据库头） */
function pageStart(pageNo: number, pageSize: number): number {
  return (pageNo - 1) * pageSize + (pageNo === 1 ? DB_HEADER_SIZE : 0)
}

/**
 * 从某个 table b-tree 根页出发，收集所有叶子页号。
 * 0x0d=叶子表，0x05=内部表；遇到其它类型报错。
 */
function collectLeafPages(data: Uint8Array, rootPage: number, pageSize: number): number[] {
  const leaves: number[] = []
  const stack = [rootPage]
  const seen = new Set<number>()

  while (stack.length > 0) {
    const pageNo = stack.pop() as number
    if (seen.has(pageNo)) throw new SqliteViewerError('b-tree 页出现循环引用，文件可能损坏')
    seen.add(pageNo)

    const start = pageStart(pageNo, pageSize)
    const type = data[start]
    const nCells = beUint16(data, start + 3)

    if (type === 0x0d) {
      leaves.push(pageNo)
      continue
    }
    if (type === 0x05) {
      // 内部表页：头部 12 字节，末尾 4 字节是最右子页
      const rightMost = beUint32(data, start + 8)
      const pointerArray = start + 12
      for (let i = 0; i < nCells; i += 1) {
        const ptrOffset = pointerArray + i * 2
        const cellOffset = beUint16(data, ptrOffset)
        const absolute = (pageNo - 1) * pageSize + cellOffset
        stack.push(beUint32(data, absolute))
      }
      stack.push(rightMost)
      continue
    }
    throw new SqliteViewerError(
      `遇到非 table b-tree 页（类型 0x${(type ?? 0).toString(16)}），无法解析 schema`,
    )
  }
  return leaves
}

/** serial type → 该值占的字节数；text/blob 同时用于取值 */
function serialSize(serial: number): number {
  if (serial === 0 || serial === 8 || serial === 9) return 0
  if (serial <= 7) return [0, 1, 2, 3, 4, 6, 8, 8][serial] ?? 0
  if (serial >= 12) return serial % 2 === 0 ? (serial - 12) / 2 : (serial - 13) / 2
  return 0
}

/**
 * 解析一条 record（sqlite_master 行）。
 * 列固定为 type, name, tbl_name, rootpage, sql；只取需要的，其余跳过。
 */
function parseRecord(payload: Uint8Array): MasterRow | null {
  const [headerLength, headerVarLen] = readVarint(payload, 0)
  const serials: number[] = []
  let cursor = headerVarLen
  while (cursor < headerLength) {
    const [serial, used] = readVarint(payload, cursor)
    serials.push(serial)
    cursor += used
  }

  const values: Array<string | number | null> = []
  let body = headerLength
  for (const serial of serials) {
    const size = serialSize(serial)
    const slice = payload.subarray(body, body + size)
    body += size

    if (serial === 0) values.push(null)
    else if (serial === 8) values.push(0)
    else if (serial === 9) values.push(1)
    else if (serial >= 1 && serial <= 6) {
      // 有符号整数（大端）
      let n = 0
      for (const b of slice) n = n * 256 + b
      const bits = size * 8
      if (slice[0] !== undefined && slice[0] & 0x80) n -= 2 ** bits
      values.push(n)
    } else if (serial === 7) {
      const view = new DataView(slice.buffer, slice.byteOffset, 8)
      values.push(view.getFloat64(0, false))
    } else if (serial >= 12) {
      values.push(new TextDecoder('utf-8').decode(slice))
    } else {
      values.push(null) // 10 / 11 reserved
    }
  }

  const type = values[0]
  const name = values[1]
  const tableName = values[2]
  const rootPage = values[3]
  const sql = values[4]
  if (typeof type !== 'string' || typeof name !== 'string') return null
  return {
    type,
    name,
    tableName: typeof tableName === 'string' ? tableName : name,
    rootPage: typeof rootPage === 'number' ? rootPage : 0,
    sql: typeof sql === 'string' ? sql : null,
  }
}

/** 解析数据库头 + sqlite_master */
export function parseDatabase(bytes: Uint8Array): SqliteInfo {
  if (bytes.length < DB_HEADER_SIZE + 8) {
    throw new SqliteViewerError('文件过小，不可能是 SQLite 数据库')
  }
  const magic = new TextDecoder('utf-8').decode(bytes.subarray(0, 16))
  if (magic !== HEADER_MAGIC) {
    throw new SqliteViewerError('文件头不是 "SQLite format 3\\0"，不是 SQLite 数据库（或已损坏）')
  }

  const pageSizeRaw = beUint16(bytes, 16)
  const pageSize = pageSizeRaw === 1 ? 65536 : pageSizeRaw
  if (![512, 1024, 2048, 4096, 8192, 16384, 32768, 65536].includes(pageSize)) {
    throw new SqliteViewerError(`非法页大小：${pageSize}，文件可能已损坏`)
  }
  const writeVersion = bytes[18]
  const readVersion = bytes[19]
  const reservedBytes = bytes[20]
  const pageCount = beUint32(bytes, 28)
  const encodingCode = beUint32(bytes, 56)
  const encoding = encodingCode === 2 ? 'UTF-16le' : encodingCode === 3 ? 'UTF-16be' : 'UTF-8'

  // sqlite_master 的根页固定为第 1 页
  const usableSize = pageSize - reservedBytes
  const leafPages = collectLeafPages(bytes, 1, pageSize)

  const objects: MasterRow[] = []
  let skippedOverflow = 0

  for (const pageNo of leafPages) {
    const start = pageStart(pageNo, pageSize)
    const type = bytes[start]
    if (type !== 0x0d) continue
    const nCells = beUint16(bytes, start + 3)
    const pointerArray = start + 8

    for (let i = 0; i < nCells; i += 1) {
      const cellPointer = beUint16(bytes, pointerArray + i * 2)
      const cell = (pageNo - 1) * pageSize + cellPointer

      const [payloadLength, lenUsed] = readVarint(bytes, cell)
      const [, rowidUsed] = readVarint(bytes, cell + lenUsed)
      const payloadStart = cell + lenUsed + rowidUsed

      // 本地负载阈值（table b-tree 叶子）。超出表示存在溢出页，受限实现跳过。
      const U = usableSize
      const X = U - 35
      if (payloadLength > X) {
        skippedOverflow += 1
        continue
      }
      if (payloadStart + payloadLength > bytes.length) {
        skippedOverflow += 1
        continue
      }
      const row = parseRecord(bytes.subarray(payloadStart, payloadStart + payloadLength))
      if (row) objects.push(row)
    }
  }

  return {
    pageSize,
    pageCount: pageCount || Math.floor(bytes.length / pageSize),
    fileSize: bytes.length,
    reservedBytes,
    encoding,
    readVersion,
    writeVersion,
    objects,
    skippedOverflow,
  }
}

/** 元数据 → 中文 Markdown */
export function renderInfo(info: SqliteInfo): string {
  const lines: string[] = ['# SQLite 数据库', '']
  lines.push(`文件大小：${info.fileSize.toLocaleString('en-US')} 字节`)
  lines.push(`页大小：${info.pageSize} 字节`)
  lines.push(`页数：${info.pageCount}`)
  lines.push(`保留字节：${info.reservedBytes}`)
  lines.push(`文本编码：${info.encoding}`)
  lines.push(`页格式（读 / 写版本）：${info.readVersion} / ${info.writeVersion}（1=legacy，2=WAL）`)

  const tables = info.objects.filter((o) => o.type === 'table' && !o.name.startsWith('sqlite_'))
  const views = info.objects.filter((o) => o.type === 'view')
  const indexes = info.objects.filter((o) => o.type === 'index')
  const triggers = info.objects.filter((o) => o.type === 'trigger')
  const internal = info.objects.filter((o) => o.name.startsWith('sqlite_'))

  lines.push('')
  lines.push(
    `对象：${tables.length} 张表、${views.length} 个视图、${indexes.length} 个索引、${triggers.length} 个触发器` +
      (internal.length > 0 ? `（另有 ${internal.length} 个内部对象）` : ''),
  )

  const section = (title: string, rows: readonly MasterRow[]): void => {
    if (rows.length === 0) return
    lines.push('', `## ${title}`, '')
    for (const row of rows) {
      lines.push(`### ${row.name}`)
      lines.push(`- 类型：${row.type}｜根页：${row.rootPage}`)
      if (row.sql) lines.push('', '```sql', row.sql.replace(/\s+$/g, ''), '```')
      lines.push('')
    }
  }

  section('表（table）', tables)
  section('视图（view）', views)
  section('索引（index）', indexes)
  section('触发器（trigger）', triggers)

  if (info.skippedOverflow > 0) {
    lines.push(
      `> 有 ${info.skippedOverflow} 行 schema 记录使用了溢出页，本受限查看器未展开（通常不影响普通数据库）。`,
    )
  }
  lines.push('> 仅展示 sqlite_master 元数据，不执行 SQL、不读取业务表数据。')
  return lines.join('\n')
}

/** 文件字节入口 */
export function transformBytes(bytes: Uint8Array): string {
  if (bytes.length > MAX_FILE_BYTES) {
    throw new SqliteViewerError('文件超过 30 MiB 上限')
  }
  return renderInfo(parseDatabase(bytes))
}

/** 文本入口不承载数据库（二进制无法粘贴） */
export function transform(input: SqliteViewerInput, _options: SqliteViewerOptions): string {
  if (!input.text || input.text.trim() === '') return ''
  throw new SqliteViewerError(
    'SQLite 是二进制文件，请使用「上传文件」入口选择 .db / .sqlite / .sqlite3 文件',
  )
}
