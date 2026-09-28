import { describe, expect, it } from 'vitest'
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFString } from 'pdf-lib'
import {
  CJK_ERROR,
  MAX_PDF_BYTES,
  assertLatin1,
  attachFileToPdf,
  describePdfLoadError,
  parseAttachment,
  validatePdfFile,
} from './utils'
import type { PdfFileInfo } from './utils'

function fileInfo(partial: Partial<PdfFileInfo>): PdfFileInfo {
  return { name: 'a.pdf', size: 1000, type: 'application/pdf', ...partial }
}

/** 造一个 1 页的空白 PDF（测试夹具） */
async function makePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([595.28, 841.89])
  return doc.save()
}

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 4))
}

/** 读取嵌入附件：返回 [文件名, 内容文本] 二元组列表 */
async function embeddedAttachments(bytes: Uint8Array): Promise<Array<[string, string]>> {
  const doc = await PDFDocument.load(bytes)
  const names = doc.catalog.lookup(PDFName.of('Names'))
  if (!(names instanceof PDFDict)) throw new Error('没有 Names')
  const tree = names.lookup(PDFName.of('EmbeddedFiles'))
  if (!(tree instanceof PDFDict)) throw new Error('没有 EmbeddedFiles')
  const arr = tree.lookup(PDFName.of('Names'))
  if (!(arr instanceof PDFArray)) throw new Error('没有 Names 数组')
  const result: Array<[string, string]> = []
  for (let i = 0; i < arr.size(); i += 2) {
    const nameObj = arr.get(i)
    const specRef = arr.get(i + 1)
    if (!(nameObj instanceof PDFString) || !(specRef instanceof PDFRef)) {
      throw new Error('附件名数组结构异常')
    }
    const spec = doc.context.lookup(specRef)
    if (!(spec instanceof PDFDict)) throw new Error('Filespec 异常')
    const ef = spec.lookup(PDFName.of('EF'))
    if (!(ef instanceof PDFDict)) throw new Error('EF 异常')
    const streamRef = ef.get(PDFName.of('F'))
    if (!(streamRef instanceof PDFRef)) throw new Error('EF.F 异常')
    const stream = doc.context.lookup(streamRef)
    const raw = (stream as unknown as { getContents: () => Uint8Array }).getContents()
    result.push([nameObj.decodeText(), new TextDecoder().decode(raw)])
  }
  return result
}

describe('pdf-attach / 基础函数', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('加载异常翻译成中文', () => {
    expect(describePdfLoadError(new Error('boom'))).toContain('PDF 加载失败')
    expect(describePdfLoadError('raw string')).toContain('raw string')
  })
})

describe('pdf-attach / 文件校验', () => {
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

describe('pdf-attach / 附件解析', () => {
  it('合法附件解析正确', () => {
    const data = parseAttachment('hello', ' notes.txt ')
    expect(data.filename).toBe('notes.txt')
    expect(new TextDecoder().decode(data.content)).toBe('hello')
  })

  it('文件名与内容校验', () => {
    expect(() => parseAttachment('x', '')).toThrow('请填写附件文件名')
    expect(() => parseAttachment('x', '  ')).toThrow('请填写附件文件名')
    expect(() => parseAttachment('x', 'a/b.txt')).toThrow('不能包含路径分隔符')
    expect(() => parseAttachment('x', 'a\\b.txt')).toThrow('不能包含路径分隔符')
    expect(() => parseAttachment('', 'a.txt')).toThrow('请填写附件内容')
    expect(() => parseAttachment('x', '中文.txt')).toThrow(CJK_ERROR)
    expect(() => parseAttachment('中文', 'a.txt')).toThrow(CJK_ERROR)
  })
})

describe('pdf-attach / attachFileToPdf', () => {
  it('附件嵌入成功，文件名与内容可验证', async () => {
    const result = await attachFileToPdf(await makePdf(), 'hello attachment', 'notes.txt')
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
    expect(await embeddedAttachments(result.bytes)).toEqual([['notes.txt', 'hello attachment']])
  })

  it('多次嵌入追加保留', async () => {
    const first = await attachFileToPdf(await makePdf(), 'one', 'a.txt')
    const second = await attachFileToPdf(first.bytes, 'two', 'b.txt')
    expect(await embeddedAttachments(second.bytes)).toEqual([
      ['a.txt', 'one'],
      ['b.txt', 'two'],
    ])
  })

  it('空文件名 / 空内容 / 中文 / 损坏分别报错', async () => {
    const pdf = await makePdf()
    await expect(attachFileToPdf(pdf, 'x', '')).rejects.toThrow('请填写附件文件名')
    await expect(attachFileToPdf(pdf, '', 'a.txt')).rejects.toThrow('请填写附件内容')
    await expect(attachFileToPdf(pdf, 'x', '中文.txt')).rejects.toThrow(CJK_ERROR)
    await expect(attachFileToPdf(new Uint8Array([1, 2, 3, 4]), 'x', 'a.txt')).rejects.toThrow(
      'PDF 加载失败',
    )
  })
})
