/**
 * excel-to-markdown 单元测试
 */
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  MAX_FILE_BYTES,
  assertWorkbookFile,
  escapeCell,
  formatSize,
  sheetToMarkdown,
  workbookBytesToMarkdown,
  workbookFileToMarkdown,
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
      ['姓名', '备注'],
      ['张三', 'a|b'],
      ['李四', '多\n行'],
    ]),
    '人员',
  )
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), '空表')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as Uint8Array<ArrayBuffer>
}

describe('excel-to-markdown / 基础工具', () => {
  it('formatSize 覆盖各档', () => {
    expect(formatSize(100)).toBe('100 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('assertWorkbookFile 四条路径', () => {
    expect(() => assertWorkbookFile({ name: 'a.xlsx', size: 10 })).not.toThrow()
    expect(() => assertWorkbookFile({ name: 'a.doc', size: 10 })).toThrow(/请选择 Excel 文件/)
    expect(() => assertWorkbookFile({ name: '', size: 10 })).toThrow(/未知/)
    expect(() => assertWorkbookFile({ name: 'a.xlsx', size: 0 })).toThrow(/文件为空/)
    expect(() => assertWorkbookFile({ name: 'a.xlsx', size: MAX_FILE_BYTES + 1 })).toThrow(
      /文件过大/,
    )
  })

  it('escapeCell 转义管道与换行', () => {
    expect(escapeCell('a|b')).toBe('a\\|b')
    expect(escapeCell('x\ny')).toBe('x<br/>y')
    expect(escapeCell('x\r\ny')).toBe('x<br/>y')
    expect(escapeCell('plain')).toBe('plain')
  })
})

describe('excel-to-markdown / 转换', () => {
  it('全部工作表：每表一段，空表标注', () => {
    const md = workbookBytesToMarkdown(demoWorkbook(), { sheet: '' })
    expect(md).toBe(
      '## 人员\n\n| 姓名 | 备注 |\n| --- | --- |\n| 张三 | a\\|b |\n| 李四 | 多<br/>行 |\n\n## 空表\n\n（空表）\n',
    )
  })

  it('指定工作表只输出该表', () => {
    const md = workbookBytesToMarkdown(demoWorkbook(), { sheet: ' 人员 ' })
    expect(md).toBe(
      '## 人员\n\n| 姓名 | 备注 |\n| --- | --- |\n| 张三 | a\\|b |\n| 李四 | 多<br/>行 |\n',
    )
  })

  it('不存在的工作表报错并列出已有表', () => {
    expect(() => workbookBytesToMarkdown(demoWorkbook(), { sheet: '工资' })).toThrow(
      /工作表「工资」不存在，现有工作表：人员、空表/,
    )
  })

  it('sheetToMarkdown 空表返回空串', () => {
    const ws = XLSX.utils.aoa_to_sheet([])
    expect(sheetToMarkdown(ws)).toBe('')
  })

  it('不等列自动补齐', () => {
    const ws = XLSX.utils.aoa_to_sheet([['a', 'b'], ['x']])
    expect(sheetToMarkdown(ws)).toBe('| a | b |\n| --- | --- |\n| x |  |')
  })

  it('CSV 输入同样可转', () => {
    const md = workbookBytesToMarkdown(new TextEncoder().encode('a,b\n1,2\n'), { sheet: '' })
    expect(md).toContain('| a | b |')
    expect(md).toContain('| 1 | 2 |')
  })

  it('空字节 / 损坏 zip / 无工作表', () => {
    expect(() => workbookBytesToMarkdown(new Uint8Array(0), { sheet: '' })).toThrow(/文件为空/)
    expect(() =>
      workbookBytesToMarkdown(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1]), { sheet: '' }),
    ).toThrow(/文件解析失败/)
    expect(() => workbookBytesToMarkdown(sheetlessWorkbook(), { sheet: '' })).toThrow(/没有工作表/)
  })
})

describe('excel-to-markdown / 文件入口', () => {
  it('合法文件走完校验与转换', async () => {
    const file = new File([demoWorkbook()], 'demo.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const md = await workbookFileToMarkdown(file, { sheet: '人员' })
    expect(md).toContain('| 姓名 | 备注 |')
  })

  it('非法扩展名在读字节前被拦下', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    await expect(workbookFileToMarkdown(file, { sheet: '' })).rejects.toThrow(/请选择 Excel 文件/)
  })
})
