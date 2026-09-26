import { describe, expect, it } from 'vitest'
import {
  ExcelToCsvError,
  columnIndex,
  decodeXml,
  detectDelimiter,
  inflateRaw,
  pickSheet,
  resolveDelimiter,
  rowsToDelimited,
  sheetToRows,
  sharedStringsFrom,
  sliceElements,
  transform,
  xlsxToRows,
} from './utils'
import type { ExcelToCsvOptions } from './schema'

const baseOptions: ExcelToCsvOptions = { delimiter: 'auto', format: 'csv' }

const WORKSHEET =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<sheetData>' +
  '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
  '<row r="2"><c r="A2"><v>870</v></c><c r="B2" t="b"><v>1</v></c></row>' +
  '</sheetData></worksheet>'

const SHARED_STRINGS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<si><t>name</t></si><si><t>工具库</t></si></sst>'

const encoder = new TextEncoder()

/** 用 CompressionStream 造 deflate-raw 数据，用来验证解压链路 */
async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Ctor = (
    globalThis as {
      CompressionStream?: new (format: string) => {
        writable: WritableStream<Uint8Array>
        readable: ReadableStream<Uint8Array>
      }
    }
  ).CompressionStream
  if (!Ctor) throw new Error('当前环境没有 CompressionStream')
  const stream = new Ctor('deflate-raw')
  const writer = stream.writable.getWriter()
  const pending = (async () => {
    await writer.write(data)
    await writer.close()
  })()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(new Uint8Array(value))
  }
  await pending
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

interface ZipEntry {
  readonly name: string
  readonly data: Uint8Array
  readonly method?: 0 | 8
}

/** 手工拼一个最小 zip：不写 CRC（解析器也不校验），够测试用 */
async function buildZip(entries: readonly ZipEntry[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const method = entry.method ?? 0
    const raw = method === 8 ? await deflateRaw(entry.data) : entry.data

    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(8, method, true)
    localView.setUint32(18, raw.length, true)
    localView.setUint32(22, entry.data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)

    const dir = new Uint8Array(46 + name.length)
    const dirView = new DataView(dir.buffer)
    dirView.setUint32(0, 0x02014b50, true)
    dirView.setUint16(6, 20, true)
    dirView.setUint16(10, method, true)
    dirView.setUint32(20, raw.length, true)
    dirView.setUint32(24, entry.data.length, true)
    dirView.setUint16(28, name.length, true)
    dirView.setUint32(42, offset, true)
    dir.set(name, 46)

    parts.push(local, raw)
    central.push(dir)
    offset += local.length + raw.length
  }

  const cdSize = central.reduce((sum, part) => sum + part.length, 0)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(8, entries.length, true)
  eocdView.setUint16(10, entries.length, true)
  eocdView.setUint32(12, cdSize, true)
  eocdView.setUint32(16, offset, true)

  const all = [...parts, ...central, eocd]
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0))
  let cursor = 0
  for (const part of all) {
    out.set(part, cursor)
    cursor += part.length
  }
  return out
}

function buildXlsx(method: 0 | 8): Promise<Uint8Array> {
  return buildZip([
    { name: '[Content_Types].xml', data: encoder.encode('<Types/>') },
    { name: 'xl/sharedStrings.xml', data: encoder.encode(SHARED_STRINGS), method },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(WORKSHEET), method },
  ])
}

describe('excel-to-csv / 文本表格', () => {
  it('自动识别 tab 并输出 CSV', () => {
    expect(transform({ text: 'a\tb\n1\t2' }, baseOptions)).toBe('a,b\n1,2')
  })

  it('显式指定分隔符时按指定值解析', () => {
    expect(transform({ text: 'a;b\n1;2' }, { ...baseOptions, delimiter: 'semicolon' })).toBe(
      'a,b\n1,2',
    )
  })

  it('输出格式可切到 tsv', () => {
    expect(transform({ text: 'a,b\n1,2' }, { ...baseOptions, format: 'tsv' })).toBe('a\tb\n1\t2')
  })

  it('列数不足时补空串', () => {
    expect(rowsToDelimited([['a', 'b'], ['1']], ',')).toBe('a,b\n1,')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '\n ' }, baseOptions)).toBe('')
  })

  it('引号不配对时抛出 ExcelToCsvError（异常）', () => {
    expect(() => transform({ text: 'a,b\n"x,1' }, baseOptions)).toThrow(ExcelToCsvError)
  })

  it('detectDelimiter 选出现次数最多的分隔符', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('tab')
    expect(resolveDelimiter('comma', 'a\tb')).toBe(',')
  })
})

describe('excel-to-csv / xlsx 最小解析', () => {
  it('读取未压缩（stored）的 xlsx', async () => {
    const rows = await xlsxToRows(await buildXlsx(0))
    expect(rows).toEqual([
      ['name', '工具库'],
      ['870', 'TRUE'],
    ])
  })

  it('读取 deflate 压缩的 xlsx', async () => {
    const rows = await xlsxToRows(await buildXlsx(8))
    expect(rows).toEqual([
      ['name', '工具库'],
      ['870', 'TRUE'],
    ])
  })

  it('非 zip 内容直接报错（异常）', async () => {
    await expect(xlsxToRows(encoder.encode('a,b\n1,2'))).rejects.toThrow(ExcelToCsvError)
  })

  it('缺少工作表时报错', async () => {
    const zip = await buildZip([{ name: '[Content_Types].xml', data: encoder.encode('<Types/>') }])
    await expect(xlsxToRows(zip)).rejects.toThrow(/没有找到工作表/)
  })

  it('inflateRaw 能还原 deflate-raw 数据', async () => {
    const raw = encoder.encode('hello hello hello')
    expect(new TextDecoder().decode(await inflateRaw(await deflateRaw(raw)))).toBe(
      'hello hello hello',
    )
  })

  it('XML 与单元格工具函数', () => {
    expect(decodeXml('a &amp; b &lt;c&gt; &#65;')).toBe('a & b <c> A')
    expect(columnIndex('A')).toBe(0)
    expect(columnIndex('B')).toBe(1)
    expect(columnIndex('AA')).toBe(26)
    expect(sharedStringsFrom(SHARED_STRINGS)).toEqual(['name', '工具库'])
    expect(sheetToRows(WORKSHEET, ['name', '工具库'])).toEqual([
      ['name', '工具库'],
      ['870', 'TRUE'],
    ])
    expect(pickSheet(['xl/worksheets/sheet1.xml'])).toBe('xl/worksheets/sheet1.xml')
    expect(sliceElements('<a><b>1</b><b>2</b></a>', 'b').map((item) => item.inner)).toEqual([
      '1',
      '2',
    ])
  })
})
