import { describe, expect, it } from 'vitest'
import { PDFArray, PDFDocument, PDFName } from 'pdf-lib'
import {
  BACKGROUND_COLORS,
  MAX_PDF_BYTES,
  addBackgroundToPdf,
  describePdfLoadError,
  resolveBackgroundColor,
  validatePdfFile,
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

/** 手写最小单页 PDF：Contents 为单个间接引用。
 *  pdf-lib 自身 save 会把 Contents 归一化为数组，只有手写 PDF 才能覆盖单对象分支。 */
function makeSingleContentsPdf(): Uint8Array {
  const stream = 'BT /F1 12 Tf 50 700 Td (hi) Tj ET'
  const parts: string[] = ['%PDF-1.7\n']
  const offsets: Record<number, number> = {}
  const obj = (n: number, body: string): void => {
    offsets[n] = parts.join('').length
    parts.push(`${n} 0 obj\n${body}\nendobj\n`)
  }
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(
    3,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  )
  obj(4, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const xrefPos = parts.join('').length
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i += 1) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n'
  parts.push(`${xref}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`)
  return new TextEncoder().encode(parts.join(''))
}

/** 取某页 Contents 数组首个流的文本（背景流应在最前） */
async function firstStreamText(bytes: Uint8Array, pageIndex: number): Promise<string> {
  const doc = await PDFDocument.load(bytes)
  const contents = doc.getPage(pageIndex).node.lookup(PDFName.of('Contents'))
  if (!(contents instanceof PDFArray)) throw new Error('Contents 不是数组')
  const stream = contents.lookup(0)
  const raw = (stream as unknown as { getContents: () => Uint8Array }).getContents()
  return new TextDecoder().decode(raw)
}

describe('pdf-background / 基础函数', () => {
  it('5 种预设颜色都能解析', () => {
    for (const [name, rgb] of Object.entries(BACKGROUND_COLORS)) {
      expect(resolveBackgroundColor(name)).toEqual(rgb)
    }
  })

  it('未知颜色报错', () => {
    expect(() => resolveBackgroundColor('red')).toThrow('未知的背景颜色')
    expect(() => resolveBackgroundColor('')).toThrow('未知的背景颜色')
  })

  it('加载异常翻译成中文', () => {
    expect(describePdfLoadError(new Error('boom'))).toContain('PDF 加载失败')
    expect(describePdfLoadError('raw string')).toContain('raw string')
  })
})

describe('pdf-background / 文件校验', () => {
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

describe('pdf-background / addBackgroundToPdf', () => {
  it('每种颜色都生成合法 PDF 且背景流在最前', async () => {
    for (const [name, [r, g, b]] of Object.entries(BACKGROUND_COLORS)) {
      const result = await addBackgroundToPdf(await makePdf(), name)
      expect(pdfHeader(result.bytes)).toBe('%PDF')
      expect(result.pages).toBe(2)
      // 两页的背景流都在最前，且颜色值正确
      for (const pageIndex of [0, 1]) {
        const text = await firstStreamText(result.bytes, pageIndex)
        expect(text).toContain(`${r} ${g} ${b} rg`)
        expect(text.startsWith('q\n')).toBe(true)
      }
    }
  })

  it('Contents 为单个引用（非数组）：背景插到最前，原内容保留', async () => {
    const result = await addBackgroundToPdf(makeSingleContentsPdf(), 'gray')
    expect(result.pages).toBe(1)
    expect(await firstStreamText(result.bytes, 0)).toContain('rg')
    const reloaded = await PDFDocument.load(result.bytes)
    const contents = reloaded.getPage(0).node.lookup(PDFName.of('Contents'))
    expect(contents).toBeInstanceOf(PDFArray)
    expect((contents as PDFArray).size()).toBe(2) // 背景 + 原内容流
  })

  it('已有内容流数组的页面：背景插到数组最前', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([595.28, 841.89])
    const arr = doc.context.obj([])
    arr.push(doc.context.register(doc.context.stream('q Q')))
    arr.push(doc.context.register(doc.context.stream('q Q')))
    page.node.set(PDFName.of('Contents'), arr)
    const result = await addBackgroundToPdf(await doc.save(), 'blue')
    expect(await firstStreamText(result.bytes, 0)).toContain('rg')
    const reloaded = await PDFDocument.load(result.bytes)
    const contents = reloaded.getPage(0).node.lookup(PDFName.of('Contents'))
    expect(contents).toBeInstanceOf(PDFArray)
    expect((contents as PDFArray).size()).toBe(3) // 背景 + 原 2 个流
  })

  it('未知颜色直接报错', async () => {
    await expect(addBackgroundToPdf(await makePdf(), 'red')).rejects.toThrow('未知的背景颜色')
  })

  it('损坏的 PDF 字节报错', async () => {
    await expect(addBackgroundToPdf(new Uint8Array([1, 2, 3, 4]), 'gray')).rejects.toThrow(
      'PDF 加载失败',
    )
  })
})
