import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  compressPdf,
  compressionRatioText,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
} from './utils'

/** 用真实 pdf-lib 构造带元数据的测试 PDF */
async function makePdfWithMetadata(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('测试标题')
  doc.setAuthor('测试作者')
  doc.setSubject('测试主题')
  doc.setKeywords(['测试', '关键字'])
  doc.setCreator('测试创建者')
  doc.setProducer('测试生产者')
  const page = doc.addPage([595, 842])
  page.drawText('Hello, PDF!')
  return doc.save()
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('%PDF 魔数识别', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e])
    expect(isPdfFile(bytes)).toBe(true)
  })

  it('非 PDF 头返回 false', () => {
    expect(isPdfFile(new Uint8Array([0x50, 0x4e, 0x47]))).toBe(false)
    expect(isPdfFile(new Uint8Array([]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
  })
})

describe('isEncryptedPdfError', () => {
  it('EncryptedPDFError 的 name 或消息识别', () => {
    const byName = new Error('anything')
    byName.name = 'EncryptedPDFError'
    expect(isEncryptedPdfError(byName)).toBe(true)
    expect(
      isEncryptedPdfError(new Error('Input document to `PDFDocument.load` is encrypted.')),
    ).toBe(true)
    expect(isEncryptedPdfError(new Error('Failed to parse PDF document'))).toBe(false)
    expect(isEncryptedPdfError('字符串')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('compressPdf', () => {
  it('压缩后可正常打开，页数一致', async () => {
    const src = await makePdfWithMetadata()
    const { bytes, pageCount } = await compressPdf(src, { removeMetadata: false })
    expect(pageCount).toBe(1)
    expect(isPdfFile(bytes)).toBe(true)
    const reopened = await PDFDocument.load(bytes)
    expect(reopened.getPageCount()).toBe(1)
  })

  it('removeMetadata 清除文档元数据', async () => {
    const src = await makePdfWithMetadata()
    const { bytes } = await compressPdf(src, { removeMetadata: true })
    // 重开时 updateMetadata:false，避免 load 盖章 Producer 干扰断言
    const reopened = await PDFDocument.load(bytes, { updateMetadata: false })
    expect(reopened.getTitle()).toBe('')
    expect(reopened.getAuthor()).toBe('')
    expect(reopened.getSubject()).toBe('')
    expect(reopened.getKeywords()).toBe('')
    expect(reopened.getCreator()).toBe('')
    expect(reopened.getProducer()).toBe('')
  })

  it('不清除元数据时保留标题', async () => {
    const src = await makePdfWithMetadata()
    const { bytes } = await compressPdf(src, { removeMetadata: false })
    const reopened = await PDFDocument.load(bytes)
    expect(reopened.getTitle()).toBe('测试标题')
    expect(reopened.getAuthor()).toBe('测试作者')
  })

  it('非法 PDF 数据抛错', async () => {
    await expect(compressPdf(new Uint8Array([1, 2, 3]), { removeMetadata: false })).rejects.toThrow(
      /Failed to parse PDF document/,
    )
  })
})

describe('compressionRatioText', () => {
  it('正常比例（边界 100% / 50% / 增大）', () => {
    expect(compressionRatioText(1000, 1000)).toBe('100.0%')
    expect(compressionRatioText(1000, 500)).toBe('50.0%')
    // 压缩后增大也如实展示（诚实性：不美化）
    expect(compressionRatioText(1000, 1050)).toBe('105.0%')
    expect(compressionRatioText(3, 1)).toBe('33.3%')
  })

  it('原大小为 0 时返回占位', () => {
    expect(compressionRatioText(0, 100)).toBe('—')
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -compressed.pdf', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-compressed.pdf')
    expect(buildOutputFileName('a.PDF')).toBe('a-compressed.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-compressed.pdf')
  })

  it('空名兜底为 document', () => {
    expect(buildOutputFileName('')).toBe('document-compressed.pdf')
    expect(buildOutputFileName('.pdf')).toBe('document-compressed.pdf')
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})
