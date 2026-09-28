/**
 * doc-convert 单元测试
 *
 * utils.ts 只放纯函数；xlsx 是本工具的正式依赖（meta.deps），可静态导入。
 * mammoth 的 docx 解析走动态加载放在 Tool.tsx，此处不覆盖。
 */
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  CONVERSION_MATRIX,
  MAX_FILE_BYTES,
  assertConvertFile,
  baseName,
  bytesToBase64,
  csvTextToJson,
  csvTextToMarkdown,
  csvTextToXlsxBytes,
  detectSourceType,
  exactBuffer,
  formatSize,
  jsonTextToCsv,
  jsonTextToXlsxBytes,
  markdownTable,
  mimeOf,
  readWorkbook,
  workbookToCsv,
  workbookToJson,
  workbookToMarkdown,
} from './utils'

/** 示例工作簿：人员表（含需转义的单元格）+ 空表 */
function sampleWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['姓名', '年龄'],
      ['张三', 30],
      ['李|四', 'a\nb'],
    ]),
    '人员',
  )
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), '空表')
  return wb
}

function sampleXlsxBytes(): Uint8Array {
  return new Uint8Array(XLSX.write(sampleWorkbook(), { type: 'array', bookType: 'xlsx' }))
}

describe('doc-convert / 基础工具', () => {
  it('mimeOf 覆盖全部目标格式', () => {
    expect(mimeOf('txt')).toContain('text/plain')
    expect(mimeOf('html')).toContain('text/html')
    expect(mimeOf('md')).toContain('markdown')
    expect(mimeOf('json')).toContain('application/json')
    expect(mimeOf('csv')).toContain('text/csv')
    expect(mimeOf('xlsx')).toContain('spreadsheetml')
  })

  it('formatSize 覆盖各档', () => {
    expect(formatSize(100)).toBe('100 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('detectSourceType 识别四种源格式', () => {
    expect(detectSourceType('a.docx')).toBe('docx')
    expect(detectSourceType('A.DOCX')).toBe('docx')
    expect(detectSourceType('a.xlsx')).toBe('xlsx')
    expect(detectSourceType('a.xls')).toBe('xlsx')
    expect(detectSourceType('a.csv')).toBe('csv')
    expect(detectSourceType('a.json')).toBe('json')
  })

  it('detectSourceType 拒绝旧版与未知类型', () => {
    expect(() => detectSourceType('a.doc')).toThrow(/暂不支持旧版 \.doc/)
    expect(() => detectSourceType('a.pdf')).toThrow(/不支持的文件类型/)
    expect(() => detectSourceType('')).toThrow(/未知/)
  })

  it('assertConvertFile 校验体积', () => {
    expect(() => assertConvertFile({ name: 'a.csv', size: 10 })).not.toThrow()
    expect(() => assertConvertFile({ name: 'a.csv', size: 0 })).toThrow(/文件为空/)
    expect(() => assertConvertFile({ name: 'a.csv', size: MAX_FILE_BYTES + 1 })).toThrow(/文件过大/)
    expect(() => assertConvertFile({ name: 'a.pdf', size: 10 })).toThrow(/不支持的文件类型/)
  })

  it('baseName 去扩展名', () => {
    expect(baseName('a.b.docx')).toBe('a.b')
    expect(baseName('noext')).toBe('noext')
  })

  it('exactBuffer 精确拷贝', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const buffer = exactBuffer(bytes)
    expect(buffer.byteLength).toBe(3)
    expect(Array.from(new Uint8Array(buffer))).toEqual([1, 2, 3])
  })

  it('bytesToBase64 分块编码', () => {
    expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=')
    expect(bytesToBase64(new Uint8Array(0))).toBe('')
    // 超过单块（0x8000）触发多轮循环
    const big = new Uint8Array(0x8000 * 2 + 1).fill(65)
    expect(bytesToBase64(big)).toBe(Buffer.from(big).toString('base64'))
  })

  it('CONVERSION_MATRIX 记录 11 种转换', () => {
    expect(CONVERSION_MATRIX.docx.map((t) => t.value)).toEqual(['txt', 'html', 'md'])
    expect(CONVERSION_MATRIX.xlsx.map((t) => t.value)).toEqual(['json', 'csv', 'md'])
    expect(CONVERSION_MATRIX.csv.map((t) => t.value)).toEqual(['json', 'md', 'xlsx'])
    expect(CONVERSION_MATRIX.json.map((t) => t.value)).toEqual(['csv', 'xlsx'])
  })
})

describe('doc-convert / xlsx 解析', () => {
  it('readWorkbook 解析正常 xlsx', () => {
    const wb = readWorkbook(sampleXlsxBytes())
    expect(wb.SheetNames).toEqual(['人员', '空表'])
  })

  it('readWorkbook 拒绝非 Excel 字节', () => {
    expect(() => readWorkbook(new Uint8Array([1, 2, 3]))).toThrow(/不是有效的 Excel/)
    expect(() => readWorkbook(new Uint8Array([9, 9, 9, 9]))).toThrow(/不是有效的 Excel/)
  })

  it('readWorkbook 魔数通过但内容损坏', () => {
    const badZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...Array(100).fill(120)])
    expect(() => readWorkbook(badZip)).toThrow(/可能已损坏/)
    // OLE 魔数（旧版 .xls 头）能通过魔数校验，内容损坏则走损坏分支
    const badOle = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    expect(() => readWorkbook(badOle)).toThrow(/可能已损坏/)
  })

  it('workbookToJson 输出全部工作表', () => {
    const parsed = JSON.parse(workbookToJson(sampleWorkbook())) as Record<string, unknown[][]>
    expect(Object.keys(parsed)).toEqual(['人员', '空表'])
    expect(parsed['人员']).toEqual([
      ['姓名', '年龄'],
      ['张三', 30],
      ['李|四', 'a\nb'],
    ])
    expect(parsed['空表']).toEqual([])
  })

  it('workbookToJson 无工作表抛错', () => {
    expect(() => workbookToJson(XLSX.utils.book_new())).toThrow(/没有工作表/)
  })

  it('workbookToCsv 取首个工作表', () => {
    const csv = workbookToCsv(sampleWorkbook())
    expect(csv).toContain('姓名')
    expect(csv).toContain('张三')
    expect(() => workbookToCsv(XLSX.utils.book_new())).toThrow(/没有工作表/)
  })

  it('workbookToMarkdown 分节与空表标注', () => {
    const md = workbookToMarkdown(sampleWorkbook())
    expect(md).toContain('## 人员')
    expect(md).toContain('| 姓名 | 年龄 |')
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('## 空表')
    expect(md).toContain('（空表）')
    expect(() => workbookToMarkdown(XLSX.utils.book_new())).toThrow(/没有工作表/)
  })

  it('markdownTable 转义管道与换行', () => {
    expect(
      markdownTable([
        ['a|b', 'c\nd'],
        ['e', 'f'],
      ]),
    ).toBe('| a\\|b | c<br/>d |\n| --- | --- |\n| e | f |')
  })

  it('markdownTable 稀疏行补空串', () => {
    expect(markdownTable([['a', 'b'], ['x']])).toBe('| a | b |\n| --- | --- |\n| x |  |')
  })
})

describe('doc-convert / csv 互转', () => {
  it('csvTextToJson 对象数组', () => {
    const parsed = JSON.parse(csvTextToJson('a,b\n1,2\n')) as unknown[]
    expect(parsed).toEqual([{ a: 1, b: 2 }])
  })

  it('csvTextToJson 空 CSV 得 []', () => {
    expect(csvTextToJson('')).toBe('[]')
  })

  it('csvTextToMarkdown 表格、空表与全空行过滤', () => {
    expect(csvTextToMarkdown('a,b\n1,2\n')).toContain('| a | b |')
    expect(csvTextToMarkdown('')).toBe('（空表）')
    // 全空数据行被过滤，只剩表头
    expect(csvTextToMarkdown('a,b\n,\n')).toBe('| a | b |\n| --- | --- |')
  })

  it('csvTextToXlsxBytes 可被读回', () => {
    const bytes = csvTextToXlsxBytes('a,b\n1,2\n')
    expect(bytes[0]).toBe(0x50) // zip 魔数
    expect(readWorkbook(bytes).SheetNames.length).toBeGreaterThan(0)
  })
})

describe('doc-convert / json 互转', () => {
  it('jsonTextToCsv 对象数组转 CSV', () => {
    const csv = jsonTextToCsv('[{"a": 1, "b": "x"}]')
    expect(csv).toContain('a,b')
    expect(csv).toContain('1,x')
  })

  it('jsonTextToCsv 拒绝非法形状', () => {
    expect(() => jsonTextToCsv('not json')).toThrow(/JSON 解析失败/)
    expect(() => jsonTextToCsv('{"a": 1}')).toThrow(/顶层必须是数组/)
    expect(() => jsonTextToCsv('[1, 2]')).toThrow(/必须是对象/)
    expect(() => jsonTextToCsv('[null]')).toThrow(/必须是对象/)
    expect(() => jsonTextToCsv('[[1]]')).toThrow(/必须是对象/)
  })

  it('jsonTextToCsv 空数组得空串', () => {
    expect(jsonTextToCsv('[]')).toBe('')
  })

  it('jsonTextToXlsxBytes 可被读回', () => {
    const bytes = jsonTextToXlsxBytes('[{"a": 1}]')
    expect(readWorkbook(bytes).SheetNames).toEqual(['Sheet1'])
    expect(() => jsonTextToXlsxBytes('oops')).toThrow(/JSON 解析失败/)
  })
})
