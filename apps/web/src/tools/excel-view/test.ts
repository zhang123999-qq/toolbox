/**
 * excel-view 单元测试
 */
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  MAX_FILE_BYTES,
  assertWorkbookFile,
  columnLabel,
  formatSize,
  parseWorkbookPreview,
  previewToText,
  previewWorkbookFile,
} from './utils'

/** 无工作表的残缺 xlsx（内嵌 base64，避免引入 fflate 测试依赖） */
function sheetlessWorkbook(): Uint8Array<ArrayBuffer> {
  const bin = atob(SHEETLESS_XLSX)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const SHEETLESS_XLSX =
  'UEsDBBQAAAAIAJYOPF1MG2LR5AAAAJQBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07EMAxFfyXKFjUpLBBCbWfBYwkshg8wqdtGzUuJZyh/j9sZNmhgZdn3Xh/LzW7xThwxFxtDK69VLQUGE3sbxla+75+rO7nrmv1XwiLYGkorJ6J0r3UxE3ooKiYMrAwxeyBu86gTmBlG1Dd1fatNDISBKlp3yK55xAEOjsTTwuMTNqMrUjycjCurlZCSswaIdX0M/S9KdSYoTm6eMtlUrtgg9UXCqvwNOOde+Q/Z9ijeINMLeHbpxenPmOePGGf1/5ILV8ZhsAb7aA6eI6qkjNCXCZG8U1tVHmz4uVtvb+6+AVBLAwQUAAAACACWDjxdHEn3vqQAAAAWAQAACwAAAF9yZWxzLy5yZWxzjc+xDoIwEAbgV2lul6KDMYbCYkxYDT5ALUdpoL2mrYpvb0cxDo6X+++7/FWz2Jk9MERDTsC2KIGhU9QbpwVcu/PmAE1dXXCWKSfiaHxk+cRFAWNK/sh5VCNaGQvy6PJmoGBlymPQ3Es1SY18V5Z7Hj4NWJus7QWEtt8C614e/7FpGIzCE6m7RZd+vPhKZFkGjUnAMvMnhelGNBUZBV5XfFWwfgNQSwMEFAAAAAgAlg48XSV8lB91AAAAhgAAAA8AAAB4bC93b3JrYm9vay54bWw1jEEOwiAQRa9C2NtBF8YYoDtPoAfAdiykZYYwRD2+xKTL/9/Ls+M3b+qNVRKT08fBaIU08Zxocfpxvx0uevT2w3V9Mq+q2yROx9bKFUCmiDnIwAWpkxfXHFqfdQEpFcMsEbHlDU7GnCGHRNrb/yfgLexV/wNQSwECFAAUAAAACACWDjxdTBti0eQAAACUAQAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUABQAAAAIAJYOPF0cSfe+pAAAABYBAAALAAAAAAAAAAAAAAAAABUBAABfcmVscy8ucmVsc1BLAQIUABQAAAAIAJYOPF0lfJQfdQAAAIYAAAAPAAAAAAAAAAAAAAAAAOIBAAB4bC93b3JrYm9vay54bWxQSwUGAAAAAAMAAwC3AAAAhAIAAAAA'

function demoWorkbook(): Uint8Array<ArrayBuffer> {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['姓名', '年龄'],
      ['张三', 30],
      ['李四', 25],
    ]),
    '人员',
  )
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), '空表')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as Uint8Array<ArrayBuffer>
}

let bigCache: Uint8Array | null = null

function bigWorkbook(): Uint8Array {
  if (bigCache === null) {
    const wb = XLSX.utils.book_new()
    const rows: unknown[][] = []
    for (let i = 0; i < 1005; i += 1) {
      const row: unknown[] = [`r${i}`]
      for (let c = 1; c < 60; c += 1) row.push(`c${c}`)
      rows.push(row)
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '大表')
    bigCache = XLSX.write(wb, {
      type: 'array',
      bookType: 'xlsx',
    }) as unknown as Uint8Array<ArrayBuffer>
  }
  return bigCache
}

describe('excel-view / 基础工具', () => {
  it('formatSize 覆盖各档', () => {
    expect(formatSize(100)).toBe('100 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('assertWorkbookFile 四条路径', () => {
    expect(() => assertWorkbookFile({ name: 'a.csv', size: 10 })).not.toThrow()
    expect(() => assertWorkbookFile({ name: 'a.doc', size: 10 })).toThrow(/请选择 Excel 文件/)
    expect(() => assertWorkbookFile({ name: '', size: 10 })).toThrow(/未知/)
    expect(() => assertWorkbookFile({ name: 'a.xlsx', size: 0 })).toThrow(/文件为空/)
    expect(() => assertWorkbookFile({ name: 'a.xlsx', size: MAX_FILE_BYTES + 1 })).toThrow(
      /文件过大/,
    )
  })

  it('columnLabel 序号转列标', () => {
    expect(columnLabel(0)).toBe('A')
    expect(columnLabel(25)).toBe('Z')
    expect(columnLabel(26)).toBe('AA')
    expect(columnLabel(27)).toBe('AB')
    expect(columnLabel(51)).toBe('AZ')
    expect(columnLabel(52)).toBe('BA')
    expect(columnLabel(701)).toBe('ZZ')
    expect(columnLabel(702)).toBe('AAA')
  })
})

describe('excel-view / 解析', () => {
  it('双工作表解析：行列与总行数', () => {
    const preview = parseWorkbookPreview(demoWorkbook(), 'demo.xlsx')
    expect(preview.fileName).toBe('demo.xlsx')
    expect(preview.sheets).toHaveLength(2)
    const [first, second] = preview.sheets
    expect(first.name).toBe('人员')
    expect(first.totalRows).toBe(3)
    expect(first.truncated).toBe(false)
    expect(first.rows[1]).toEqual(['张三', '30'])
    expect(second.name).toBe('空表')
    expect(second.rows).toEqual([])
  })

  // 6 万单元格的 xlsx.write 在 coverage 插桩下约 4–6 秒，单独放宽超时
  it('超限表格截断行列并标记', { timeout: 30000 }, () => {
    const preview = parseWorkbookPreview(bigWorkbook(), 'big.xlsx')
    const sheet = preview.sheets[0]
    expect(sheet.totalRows).toBe(1005)
    expect(sheet.truncated).toBe(true)
    expect(sheet.rows).toHaveLength(1000)
    expect(sheet.rows[0]).toHaveLength(50)
  })

  it('CSV 输入同样可解析', () => {
    const preview = parseWorkbookPreview(new TextEncoder().encode('a,b\n1,2\n'), 'a.csv')
    expect(preview.sheets[0].rows[0]).toEqual(['a', 'b'])
  })

  it('空字节 / 损坏 zip / 无工作表', () => {
    expect(() => parseWorkbookPreview(new Uint8Array(0), 'x.xlsx')).toThrow(/文件为空/)
    expect(() =>
      parseWorkbookPreview(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1]), 'x.xlsx'),
    ).toThrow(/文件解析失败/)
    expect(() => parseWorkbookPreview(sheetlessWorkbook(), 'x.xlsx')).toThrow(/没有工作表/)
  })
})

describe('excel-view / 文本与文件入口', () => {
  it('previewToText 生成 TSV 汇总', () => {
    const text = previewToText(parseWorkbookPreview(demoWorkbook(), 'demo.xlsx'))
    expect(text).toContain('工作簿：demo.xlsx（2 个工作表）')
    expect(text).toContain('## 人员（共 3 行）')
    expect(text).toContain('张三\t30')
    expect(text).toContain('## 空表（共 0 行）')
    expect(text).toContain('（空表）')
  })

  it('previewToText 标注截断', () => {
    const text = previewToText(parseWorkbookPreview(bigWorkbook(), 'big.xlsx'))
    expect(text).toContain('仅显示前 1000 行')
  })

  it('合法文件走完校验与解析', async () => {
    const file = new File([demoWorkbook()], 'demo.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const preview = await previewWorkbookFile(file)
    expect(preview.sheets).toHaveLength(2)
  })

  it('非法扩展名在读字节前被拦下', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    await expect(previewWorkbookFile(file)).rejects.toThrow(/请选择 Excel 文件/)
  })
})
