import { describe, expect, it } from 'vitest'
import { PDFDict, PDFDocument, PDFName, PDFRef, PDFString } from 'pdf-lib'
import type { PDFObject } from 'pdf-lib'
import {
  CJK_ERROR,
  MAX_PDF_BYTES,
  addBookmarksToPdf,
  assertLatin1,
  checkBookmarkPages,
  describePdfLoadError,
  parseBookmarks,
  validatePdfFile,
} from './utils'
import type { BookmarkItem, PdfFileInfo } from './utils'

function fileInfo(partial: Partial<PdfFileInfo>): PdfFileInfo {
  return { name: 'a.pdf', size: 1000, type: 'application/pdf', ...partial }
}

/** 造一个 3 页的空白 PDF（测试夹具） */
async function makePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < 3; i += 1) doc.addPage([595.28, 841.89])
  return doc.save()
}

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 4))
}

/** 读取书签链表的标题序列 */
async function bookmarkTitles(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes)
  const outlines = doc.catalog.lookup(PDFName.of('Outlines'))
  if (!(outlines instanceof PDFDict)) throw new Error('没有 Outlines')
  const titles: string[] = []
  let current: PDFObject | undefined = outlines.lookup(PDFName.of('First'))
  while (current instanceof PDFDict) {
    const title = current.get(PDFName.of('Title'))
    if (!(title instanceof PDFString)) throw new Error('Title 不是 PDFString')
    titles.push(title.decodeText())
    const next = current.get(PDFName.of('Next'))
    current = next instanceof PDFRef ? doc.context.lookup(next) : undefined
  }
  return titles
}

describe('pdf-bookmark / 基础函数', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('加载异常翻译成中文', () => {
    expect(describePdfLoadError(new Error('boom'))).toContain('PDF 加载失败')
    expect(describePdfLoadError('raw string')).toContain('raw string')
  })
})

describe('pdf-bookmark / 文件校验', () => {
  it('合法 PDF 通过', () => {
    expect(() => validatePdfFile(fileInfo({}))).not.toThrow()
  })

  it('空文件 / 超大文件 / 非 PDF 报错', () => {
    expect(() => validatePdfFile(fileInfo({ size: 0 }))).toThrow('文件为空')
    expect(() => validatePdfFile(fileInfo({ size: MAX_PDF_BYTES + 1 }))).toThrow(
      '超过 100 MiB 上限',
    )
    expect(() => validatePdfFile(fileInfo({ name: 'a.txt', type: 'text/plain' }))).toThrow(
      '请选择 PDF 文件',
    )
  })
})

describe('pdf-bookmark / 书签解析', () => {
  it('合法列表解析正确', () => {
    expect(parseBookmarks('Chapter 1,1\nChapter 2,3')).toEqual([
      { title: 'Chapter 1', page: 1 },
      { title: 'Chapter 2', page: 3 },
    ])
  })

  it('标题含逗号时以最后一个逗号分隔', () => {
    expect(parseBookmarks('A, B,2')).toEqual([{ title: 'A, B', page: 2 }])
  })

  it('空行被跳过', () => {
    expect(parseBookmarks('\nChapter 1,1\n\n')).toHaveLength(1)
  })

  it('空输入 / 全空行报错', () => {
    expect(() => parseBookmarks('')).toThrow('请填写书签列表')
    expect(() => parseBookmarks('  \n ')).toThrow('请填写书签列表')
  })

  it('中文标题报错', () => {
    expect(() => parseBookmarks('第一章,1')).toThrow(CJK_ERROR)
  })

  it('格式错误时报错并带行号', () => {
    expect(() => parseBookmarks('Chapter 1,1\nNoComma')).toThrow('第 2 行格式错误')
    expect(() => parseBookmarks(',2')).toThrow('第 1 行标题不能为空')
    expect(() => parseBookmarks('A,0')).toThrow('第 1 行页码必须是大于 0 的整数')
    expect(() => parseBookmarks('A,1.5')).toThrow('第 1 行页码必须是大于 0 的整数')
    expect(() => parseBookmarks('A,x')).toThrow('第 1 行页码必须是大于 0 的整数')
  })
})

describe('pdf-bookmark / 页码范围', () => {
  const items: BookmarkItem[] = [
    { title: 'A', page: 1 },
    { title: 'B', page: 3 },
  ]

  it('范围内通过', () => {
    expect(() => checkBookmarkPages(items, 3)).not.toThrow()
  })

  it('超范围报错并带书签名', () => {
    expect(() => checkBookmarkPages(items, 2)).toThrow('书签「B」的页码超出范围：PDF 共 2 页')
  })
})

describe('pdf-bookmark / addBookmarksToPdf', () => {
  it('多条书签写入成功，链表可验证', async () => {
    const result = await addBookmarksToPdf(await makePdf(), 'Chapter 1,1\nChapter 2,2\nAppendix,3')
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(3)
    expect(await bookmarkTitles(result.bytes)).toEqual(['Chapter 1', 'Chapter 2', 'Appendix'])
  })

  it('单条书签写入成功', async () => {
    const result = await addBookmarksToPdf(await makePdf(), 'Only,2')
    expect(await bookmarkTitles(result.bytes)).toEqual(['Only'])
  })

  it('空列表 / 中文 / 超范围 / 损坏分别报错', async () => {
    const pdf = await makePdf()
    await expect(addBookmarksToPdf(pdf, '  ')).rejects.toThrow('请填写书签列表')
    await expect(addBookmarksToPdf(pdf, '中文,1')).rejects.toThrow(CJK_ERROR)
    await expect(addBookmarksToPdf(pdf, 'A,9')).rejects.toThrow('PDF 共 3 页')
    await expect(addBookmarksToPdf(new Uint8Array([1, 2, 3, 4]), 'A,1')).rejects.toThrow(
      'PDF 加载失败',
    )
  })
})
