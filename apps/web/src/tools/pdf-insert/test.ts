import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  CJK_ERROR,
  MAX_PDF_BYTES,
  assertLatin1,
  checkPageInRange,
  describePdfLoadError,
  insertTextIntoPdf,
  parsePageNumber,
  validatePdfFile,
} from './utils'
import type { PdfFileInfo } from './utils'

function fileInfo(partial: Partial<PdfFileInfo>): PdfFileInfo {
  return { name: 'a.pdf', size: 1000, type: 'application/pdf', ...partial }
}

/** 造一个 N 页的空白 PDF（测试夹具） */
async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i += 1) doc.addPage([595.28, 841.89])
  return doc.save()
}

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 4))
}

describe('pdf-insert / 基础函数', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('加载异常翻译成中文', () => {
    expect(describePdfLoadError(new Error('boom'))).toContain('PDF 加载失败')
    expect(describePdfLoadError('oops')).toContain('PDF 加载失败')
  })
})

describe('pdf-insert / 文件校验', () => {
  it('合法 PDF 通过', () => {
    expect(() => validatePdfFile(fileInfo({}))).not.toThrow()
    expect(() => validatePdfFile(fileInfo({ type: '', name: 'DOC.PDF' }))).not.toThrow()
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

describe('pdf-insert / 页码', () => {
  it('合法页码解析', () => {
    expect(parsePageNumber('1')).toBe(1)
    expect(parsePageNumber(' 3 ')).toBe(3)
  })

  it('非法页码报错', () => {
    expect(() => parsePageNumber('')).toThrow('请填写页码')
    expect(() => parsePageNumber('  ')).toThrow('请填写页码')
    expect(() => parsePageNumber('0')).toThrow('页码必须是大于 0 的整数')
    expect(() => parsePageNumber('-2')).toThrow('页码必须是大于 0 的整数')
    expect(() => parsePageNumber('1.5')).toThrow('页码必须是大于 0 的整数')
    expect(() => parsePageNumber('abc')).toThrow('页码必须是大于 0 的整数')
  })

  it('范围校验', () => {
    expect(() => checkPageInRange(1, 3)).not.toThrow()
    expect(() => checkPageInRange(3, 3)).not.toThrow()
    expect(() => checkPageInRange(4, 3)).toThrow('PDF 共 3 页')
  })
})

describe('pdf-insert / insertTextIntoPdf', () => {
  it('第 1 页插入文字成功', async () => {
    const result = await insertTextIntoPdf(await makePdf(2), 'Hello', '1')
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(2)
    // 插入后仍是合法 PDF：重新加载页数不变
    const reloaded = await PDFDocument.load(result.bytes)
    expect(reloaded.getPageCount()).toBe(2)
  })

  it('第 2 页插入成功', async () => {
    const result = await insertTextIntoPdf(await makePdf(2), 'Page two', '2')
    expect(result.pages).toBe(2)
  })

  it('空文字 / 中文 / 非法页码 / 超范围分别报错', async () => {
    const pdf = await makePdf(2)
    await expect(insertTextIntoPdf(pdf, '   ', '1')).rejects.toThrow('请输入要插入的文字')
    await expect(insertTextIntoPdf(pdf, '中文', '1')).rejects.toThrow(CJK_ERROR)
    await expect(insertTextIntoPdf(pdf, 'Hi', '')).rejects.toThrow('请填写页码')
    await expect(insertTextIntoPdf(pdf, 'Hi', '5')).rejects.toThrow('PDF 共 2 页')
  })

  it('损坏的 PDF 字节报错', async () => {
    await expect(insertTextIntoPdf(new Uint8Array([1, 2, 3, 4]), 'Hi', '1')).rejects.toThrow(
      'PDF 加载失败',
    )
  })
})
