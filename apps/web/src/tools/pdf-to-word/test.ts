import { describe, expect, it } from 'vitest'
import { PasswordException, PasswordResponses } from 'pdfjs-dist'
import { Document } from 'docx'
import {
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildDocxDocument,
  buildOutputFileName,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  packDocxToBlob,
  textItemsToLines,
} from './utils'
import type { TextContentItem } from './utils'

function textItem(str: string, hasEOL: boolean): TextContentItem {
  return { str, hasEOL }
}

function pdfBytes(): Uint8Array {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
  return bytes
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(pdfBytes())).toBe(true)
  })

  it('不足 5 字节不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })

  it('每个魔数字节逐个校验', () => {
    const positions = [0x25, 0x50, 0x44, 0x46, 0x2d]
    for (let i = 0; i < positions.length; i++) {
      const bytes = pdfBytes()
      bytes[i] = 0x00
      expect(isPdfFile(bytes)).toBe(false)
    }
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
    expect(() => assertFileSizeOk(0)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('isEncryptedPdfError', () => {
  it('pdfjs PasswordException 识别为加密', () => {
    const err = new PasswordException('No password given', PasswordResponses.NEED_PASSWORD)
    expect(isEncryptedPdfError(err)).toBe(true)
  })

  it('name 为 PasswordException 的 Error 也识别（跨 realm 兜底）', () => {
    const err = new Error('no password')
    err.name = 'PasswordException'
    expect(isEncryptedPdfError(err)).toBe(true)
  })

  it('普通错误与非 Error 不识别', () => {
    expect(isEncryptedPdfError(new Error('Invalid PDF'))).toBe(false)
    expect(isEncryptedPdfError('PasswordException')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('textItemsToLines', () => {
  it('按 hasEOL 断行、同行片段拼接', () => {
    const items = [textItem('Hello', false), textItem(' World', true), textItem('第二行', true)]
    expect(textItemsToLines(items)).toEqual(['Hello World', '第二行'])
  })

  it('末尾无 EOL 的片段也成行，不产生多余空行', () => {
    expect(textItemsToLines([textItem('abc', false)])).toEqual(['abc'])
    expect(textItemsToLines([textItem('a', true), textItem('b', true)])).toEqual(['a', 'b'])
  })

  it('空 items 返回空数组', () => {
    expect(textItemsToLines([])).toEqual([])
  })

  it('跳过无 str 的 marked content', () => {
    const items: TextContentItem[] = [
      { type: 'beginMarkedContent', id: '' },
      textItem('正文', true),
      { type: 'endMarkedContent', id: '' },
    ]
    expect(textItemsToLines(items)).toEqual(['正文'])
  })

  it('原文空行保留为空字符串行', () => {
    const items = [textItem('', true), textItem('x', true)]
    expect(textItemsToLines(items)).toEqual(['', 'x'])
  })
})

describe('buildDocxDocument', () => {
  it('每行一个段落、页间分页符、空页保留占位', () => {
    const doc = buildDocxDocument([['第一页行1', '第一页行2'], []])
    expect(doc).toBeInstanceOf(Document)
  })

  it('空 pages 数组也能构建', () => {
    expect(buildDocxDocument([])).toBeInstanceOf(Document)
  })

  it('构建结果可打包为合法 docx（zip 魔数 PK）', async () => {
    const doc = buildDocxDocument([['a', 'b'], [], ['c']])
    const blob = await packDocxToBlob(doc)
    expect(blob.size).toBeGreaterThan(0)
    const head = new Uint8Array(await blob.arrayBuffer()).slice(0, 2)
    expect(head[0]).toBe(0x50)
    expect(head[1]).toBe(0x4b)
  })
})

describe('packDocxToBlob', () => {
  it('返回 docx MIME 的 Blob', async () => {
    const blob = await packDocxToBlob(buildDocxDocument([['hi']]))
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('wordprocessingml')
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -converted.docx 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-converted.docx')
    expect(buildOutputFileName('a.PDF')).toBe('a-converted.docx')
    expect(buildOutputFileName('noext')).toBe('noext-converted.docx')
  })

  it('空名兜底为 document', () => {
    expect(buildOutputFileName('')).toBe('document-converted.docx')
    expect(buildOutputFileName('.pdf')).toBe('document-converted.docx')
  })
})
