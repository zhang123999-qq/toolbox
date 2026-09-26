import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  parseDatabase,
  renderInfo,
  SqliteViewerError,
  transform,
  transformBytes,
} from './utils'
import type { SqliteViewerInput } from './schema'

const PAGE_SIZE = 4096

/** 构造一个最小合法的 2 页 SQLite 数据库：sqlite_master 里有一张 t1，第 2 页为其空叶子页 */
function buildSqlite(): Uint8Array {
  const db = new Uint8Array(PAGE_SIZE * 2)
  const view = new DataView(db.buffer)
  const enc = new TextEncoder()

  db.set(enc.encode('SQLite format 3\u0000'), 0)
  view.setUint16(16, PAGE_SIZE, false) // 页大小（大端）
  db[18] = 1 // 写版本 legacy
  db[19] = 1 // 读版本 legacy
  db[20] = 0 // 保留字节
  db[21] = 64
  db[22] = 32
  db[23] = 32
  view.setUint32(28, 2, false) // 页数
  view.setUint32(44, 4, false) // schema 格式号
  view.setUint32(56, 1, false) // UTF-8

  // —— sqlite_master 记录（page 1 的叶子表 b-tree）——
  const typeStr = 'table'
  const nameStr = 't1'
  const sqlStr = 'CREATE TABLE t1(id INTEGER PRIMARY KEY, name TEXT)'
  const record = [
    ...[
      6,
      13 + 2 * typeStr.length,
      13 + 2 * nameStr.length,
      13 + 2 * nameStr.length,
      1,
      13 + 2 * sqlStr.length,
    ],
    ...enc.encode(typeStr),
    ...enc.encode(nameStr),
    ...enc.encode(nameStr),
    0x02, // rootpage = 2（1 字节整数，serial 1）
    ...enc.encode(sqlStr),
  ]
  const cell = [record.length, 1, ...record] // payload 长度 varint + rowid=1 + payload

  const pageHeaderStart = 100
  db[pageHeaderStart] = 0x0d // leaf table b-tree
  view.setUint16(pageHeaderStart + 3, 1, false) // ncells
  const cellOffset = PAGE_SIZE - cell.length
  view.setUint16(pageHeaderStart + 5, cellOffset, false) // cell content start（相对页首）
  view.setUint16(pageHeaderStart + 8, cellOffset, false) // 单元格指针数组（相对页首）
  db.set(cell, cellOffset)

  // —— 第 2 页：t1 的空叶子页 ——
  const p2 = PAGE_SIZE
  db[p2] = 0x0d
  view.setUint16(p2 + 3, 0, false)
  view.setUint16(p2 + 5, 0xffff, false) // 空页 cell content start
  return db
}

describe('sqlite-viewer / parseDatabase', () => {
  it('读出文件头字段', () => {
    const info = parseDatabase(buildSqlite())
    expect(info.pageSize).toBe(PAGE_SIZE)
    expect(info.pageCount).toBe(2)
    expect(info.encoding).toBe('UTF-8')
    expect(info.fileSize).toBe(PAGE_SIZE * 2)
  })

  it('从 sqlite_master 解析出 t1 及其 DDL、根页', () => {
    const info = parseDatabase(buildSqlite())
    expect(info.objects).toHaveLength(1)
    const row = info.objects[0]
    expect(row).toMatchObject({
      type: 'table',
      name: 't1',
      tableName: 't1',
      rootPage: 2,
    })
    expect(row.sql).toContain('CREATE TABLE t1')
  })

  it('renderInfo 输出 Markdown 表清单', () => {
    const text = renderInfo(parseDatabase(buildSqlite()))
    expect(text).toContain('# SQLite 数据库')
    expect(text).toContain('1 张表')
    expect(text).toContain('### t1')
    expect(text).toContain('INTEGER PRIMARY KEY')
  })
})

describe('sqlite-viewer / 异常与入口', () => {
  it('magic 不符抛错', () => {
    const bad = new Uint8Array(200)
    bad.set(new TextEncoder().encode('not a sqlite database'), 0)
    expect(() => transformBytes(bad)).toThrow(SqliteViewerError)
  })

  it('文件过小抛错', () => {
    expect(() => transformBytes(new Uint8Array(10))).toThrow(SqliteViewerError)
  })

  it('超大文件抛错（边界）', () => {
    expect(() => transformBytes(new Uint8Array(MAX_FILE_BYTES + 1))).toThrow(/30 MiB/)
  })

  it('文本入口：空串返回空，其余提示走文件上传', () => {
    expect(transform({ text: '' } as SqliteViewerInput, {})).toBe('')
    expect(() => transform({ text: 'binary db' } as SqliteViewerInput, {})).toThrow(/上传文件/)
  })
})
