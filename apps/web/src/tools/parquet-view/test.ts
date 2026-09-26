import { describe, expect, it } from 'vitest'
import {
  ParquetViewError,
  parseParquet,
  renderMetadata,
  transformBytes,
  transform,
  MAX_FILE_BYTES,
} from './utils'
import type { ParquetViewInput } from './schema'

// —— 测试专用：一个最小 Thrift Compact 编码器，用来合成 Parquet 页脚 ——
class CompactWriter {
  private bytes: number[] = []
  private prevId = 0

  private varuint(n: number): void {
    let value = n >>> 0
    while (value >= 0x80) {
      this.bytes.push((value & 0x7f) | 0x80)
      value >>>= 7
    }
    this.bytes.push(value & 0x7f)
  }

  private zigzag(n: number): void {
    this.varuint((n << 1) ^ (n >> 31))
  }

  private fieldHeader(id: number, type: number): void {
    const delta = id - this.prevId
    if (delta >= 1 && delta <= 15) {
      this.bytes.push((delta << 4) | type)
    } else {
      this.bytes.push(type)
      this.zigzag(id)
    }
    this.prevId = id
  }

  i32(id: number, value: number): void {
    this.fieldHeader(id, 5)
    this.zigzag(value)
  }

  i64(id: number, value: number): void {
    this.fieldHeader(id, 6)
    this.zigzag(value)
  }

  string(id: number, value: string): void {
    this.fieldHeader(id, 8)
    const body = new TextEncoder().encode(value)
    this.varuint(body.length)
    this.bytes.push(...body)
  }

  list(id: number, elemType: number, encodeEach: () => void, size: number): void {
    this.fieldHeader(id, 9)
    this.bytes.push((size << 4) | elemType)
    encodeEach()
  }

  /** list / set 的元素：裸值（struct 元素不再带外层字段头） */
  element(encode: (w: CompactWriter) => void): void {
    const inner = new CompactWriter()
    encode(inner)
    this.bytes.push(...inner.toBytes())
  }

  /** struct 字段：写字段头再拼接子 struct 字节 */
  struct(id: number, encode: (w: CompactWriter) => void): void {
    this.fieldHeader(id, 12)
    this.element(encode)
  }

  stop(): void {
    this.bytes.push(0)
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes)
  }
}

/** 合成一个最小合法 Parquet（仅页脚元数据，列数据区留空） */
function buildParquet(): Uint8Array {
  const md = new CompactWriter()
  md.i32(1, 1) // version
  md.list(
    2,
    12,
    () => {
      md.element((s) => {
        s.string(4, 'root')
        s.i32(5, 2)
        s.stop()
      })
      md.element((s) => {
        s.i32(1, 1) // INT32
        s.i32(3, 0) // required
        s.string(4, 'id')
        s.stop()
      })
      md.element((s) => {
        s.i32(1, 6) // BYTE_ARRAY
        s.i32(3, 1) // optional
        s.string(4, 'name')
        s.i32(6, 0) // UTF8
        s.stop()
      })
    },
    3,
  )
  md.i64(3, 2) // num_rows
  md.list(
    4,
    12,
    () => {
      md.element((s) => {
        s.i64(3, 2) // row_group.num_rows
        s.stop()
      })
    },
    1,
  )
  md.string(6, 'demo-writer 1.0')
  md.stop()

  const metaBytes = md.toBytes()
  const file = new Uint8Array(4 + metaBytes.length + 8)
  file.set(new TextEncoder().encode('PAR1'), 0)
  file.set(metaBytes, 4)
  const view = new DataView(file.buffer)
  view.setUint32(file.length - 8, metaBytes.length, true)
  file.set(new TextEncoder().encode('PAR1'), file.length - 4)
  return file
}

describe('parquet-view / parseParquet', () => {
  it('解析版本、行数、row group、created_by', () => {
    const meta = parseParquet(buildParquet())
    expect(meta.version).toBe(1)
    expect(meta.numRows).toBe(2)
    expect(meta.rowGroupCount).toBe(1)
    expect(meta.createdBy).toBe('demo-writer 1.0')
  })

  it('重建 schema 树并统计叶子列', () => {
    const meta = parseParquet(buildParquet())
    expect(meta.root.name).toBe('root')
    expect(meta.columnCount).toBe(2)
    expect(meta.root.children.map((c) => c.name)).toEqual(['id', 'name'])
    expect(meta.root.children[0].physicalType).toBe('INT32')
    expect(meta.root.children[1].convertedType).toBe('UTF8')
    expect(meta.root.children[1].repetition).toBe('optional')
  })

  it('renderMetadata 输出 Markdown', () => {
    const text = renderMetadata(parseParquet(buildParquet()))
    expect(text).toContain('# Parquet 元数据')
    expect(text).toContain('总行数：2')
    expect(text).toContain('id')
    expect(text).toContain('UTF8')
  })
})

describe('parquet-view / 异常与入口', () => {
  it('文件头不是 PAR1 抛错', () => {
    const bad = new Uint8Array([1, 2, 3, 4, 0, 0, 0, 0, 0x50, 0x41, 0x52, 0x31])
    expect(() => parseParquet(bad)).toThrow(ParquetViewError)
  })

  it('文件过小抛错', () => {
    expect(() => transformBytes(new Uint8Array(5))).toThrow(ParquetViewError)
  })

  it('transformBytes 超大文件抛错（边界）', () => {
    expect(() => transformBytes(new Uint8Array(MAX_FILE_BYTES + 1))).toThrow(/30 MiB/)
  })

  it('文本入口：空串返回空，其余提示走文件上传', () => {
    expect(transform({ text: '' } as ParquetViewInput, {})).toBe('')
    expect(() => transform({ text: 'hello' } as ParquetViewInput, {})).toThrow(/上传文件/)
  })
})
