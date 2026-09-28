import { describe, expect, it } from 'vitest'
import { PDFArray, PDFDocument, PDFName, PDFString } from 'pdf-lib'
import {
  CJK_ERROR,
  MAX_PDF_BYTES,
  addLinkToPdf,
  assertLatin1,
  checkPageInRange,
  describePdfLoadError,
  parsePageNumber,
  validatePdfFile,
  validateUrl,
} from './utils'
import type { PdfFileInfo } from './utils'

function fileInfo(partial: Partial<PdfFileInfo>): PdfFileInfo {
  return { name: 'a.pdf', size: 1000, type: 'application/pdf', ...partial }
}

/** 造一个 2 页的空白 PDF（测试夹具） */
async function makePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([595.28, 841.89])
  doc.addPage([595.28, 841.89])
  return doc.save()
}

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 4))
}

/** 取某页的 Link 注释（应恰好 1 个），返回其 URI */
async function linkUriOf(bytes: Uint8Array, pageIndex: number): Promise<string> {
  const doc = await PDFDocument.load(bytes)
  const annots = doc.getPage(pageIndex).node.lookup(PDFName.of('Annots'))
  if (!(annots instanceof PDFArray)) throw new Error('Annots 不是数组')
  if (annots.size() !== 1) throw new Error(`期望 1 个注释，实际 ${annots.size()} 个`)
  const annot = annots.lookup(0)
  const action = (annot as unknown as { lookup: (k: unknown) => unknown }).lookup(
    PDFName.of('A'),
  ) as {
    lookup: (k: unknown) => unknown
  }
  const uri = action.lookup(PDFName.of('URI'))
  if (!(uri instanceof PDFString)) throw new Error('URI 不是 PDFString')
  return uri.decodeText()
}

describe('pdf-link / 基础函数', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('加载异常翻译成中文', () => {
    expect(describePdfLoadError(new Error('boom'))).toContain('PDF 加载失败')
    expect(describePdfLoadError('raw string')).toContain('raw string')
  })
})

describe('pdf-link / 文件校验', () => {
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

describe('pdf-link / 链接与页码', () => {
  it('合法链接通过（自动 trim）', () => {
    expect(validateUrl('  https://example.com/a?b=1  ')).toBe('https://example.com/a?b=1')
    expect(validateUrl('http://example.com')).toBe('http://example.com')
  })

  it('非法链接报错', () => {
    expect(() => validateUrl('')).toThrow('请填写链接网址')
    expect(() => validateUrl('   ')).toThrow('请填写链接网址')
    expect(() => validateUrl('ftp://example.com')).toThrow('必须是 http:// 或 https:// 开头')
    expect(() => validateUrl('example.com')).toThrow('必须是 http:// 或 https:// 开头')
    expect(() => validateUrl('https://例子.com')).toThrow(CJK_ERROR)
  })

  it('页码解析与范围校验', () => {
    expect(parsePageNumber('2')).toBe(2)
    expect(() => parsePageNumber('')).toThrow('请填写页码')
    expect(() => parsePageNumber('1.5')).toThrow('页码必须是大于 0 的整数')
    expect(() => checkPageInRange(2, 2)).not.toThrow()
    expect(() => checkPageInRange(3, 2)).toThrow('PDF 共 2 页')
  })
})

describe('pdf-link / addLinkToPdf', () => {
  it('第 1 页插入链接成功，注释可验证', async () => {
    const result = await addLinkToPdf(await makePdf(), 'Visit us', 'https://example.com', '1')
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(2)
    expect(await linkUriOf(result.bytes, 0)).toBe('https://example.com')
    // 第 2 页没有注释
    const doc = await PDFDocument.load(result.bytes)
    expect(doc.getPage(1).node.get(PDFName.of('Annots'))).toBeUndefined()
  })

  it('第 2 页插入成功', async () => {
    const result = await addLinkToPdf(await makePdf(), 'Docs', 'http://example.com/d', '2')
    expect(await linkUriOf(result.bytes, 1)).toBe('http://example.com/d')
  })

  it('空文字 / 中文 / 非法链接 / 非法页码 / 超范围分别报错', async () => {
    const pdf = await makePdf()
    await expect(addLinkToPdf(pdf, '  ', 'https://example.com', '1')).rejects.toThrow(
      '请输入链接显示文字',
    )
    await expect(addLinkToPdf(pdf, '中文', 'https://example.com', '1')).rejects.toThrow(CJK_ERROR)
    await expect(addLinkToPdf(pdf, 'Hi', 'not-a-url', '1')).rejects.toThrow('http:// 或 https://')
    await expect(addLinkToPdf(pdf, 'Hi', 'https://example.com', 'x')).rejects.toThrow(
      '页码必须是大于 0 的整数',
    )
    await expect(addLinkToPdf(pdf, 'Hi', 'https://example.com', '5')).rejects.toThrow('PDF 共 2 页')
  })

  it('损坏的 PDF 字节报错', async () => {
    await expect(
      addLinkToPdf(new Uint8Array([1, 2, 3, 4]), 'Hi', 'https://example.com', '1'),
    ).rejects.toThrow('PDF 加载失败')
  })
})
