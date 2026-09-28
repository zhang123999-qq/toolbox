import { describe, expect, it } from 'vitest'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  applyPdfMetadata,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatPdfDate,
  isEncryptedPdfError,
  isPdfFile,
  joinKeywords,
  parseKeywords,
  pdfErrorMessage,
  readPdfMetadata,
  textOrEmpty,
} from './utils'
import { metadataFormSchema } from './schema'

/** 用真实 pdf-lib 生成小型测试 PDF */
async function makePdf(meta?: {
  title?: string
  author?: string
  subject?: string
  keywords?: string[]
  creator?: string
  producer?: string
  pages?: number
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const pages = meta?.pages ?? 1
  for (let i = 0; i < pages; i++) doc.addPage([300, 200])
  if (meta?.title !== undefined) doc.setTitle(meta.title)
  if (meta?.author !== undefined) doc.setAuthor(meta.author)
  if (meta?.subject !== undefined) doc.setSubject(meta.subject)
  if (meta?.keywords !== undefined) doc.setKeywords(meta.keywords)
  if (meta?.creator !== undefined) doc.setCreator(meta.creator)
  if (meta?.producer !== undefined) doc.setProducer(meta.producer)
  // fixture 保存同样禁用 addDefaultPage，否则 0 页用例在构造阶段就被加页
  return new Uint8Array(await doc.save({ addDefaultPage: false }))
}

/**
 * 构造「带 /Encrypt 标记」的 PDF：pdf-lib 的 PDFDocument.load 见到
 * trailer /Encrypt 即抛 EncryptedPDFError，无需真实加密内容。
 * （思路源自 pdf-encrypt 的测试 fixture）
 */
async function makeEncryptedMarkerPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([300, 200])
  const bytes = Buffer.from(await doc.save())
  const s = bytes.toString('latin1')
  const root = s.match(/\/Root\s+(\d+\s+\d+\s+R)/)?.[1]
  const prev = Number(s.match(/startxref\s+(\d+)/)?.[1])
  if (!root || !Number.isFinite(prev)) throw new Error('fixture 构造失败：解析 trailer 失败')
  const encObj = '10 0 obj\n<< /Filter /Standard /V 4 /R 4 /O (xx) /U (yy) /P -4 >>\nendobj\n'
  const encOffset = bytes.length
  const xrefOffset = encOffset + encObj.length
  const xref =
    'xref\n0 1\n0000000000 65535 f \n10 1\n' + String(encOffset).padStart(10, '0') + ' 00000 n \n'
  const trailer =
    `trailer\n<< /Size 11 /Root ${root} /Encrypt 10 0 R /Prev ${prev} >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`
  return new Uint8Array(Buffer.concat([bytes, Buffer.from(encObj + xref + trailer, 'latin1')]))
}

function encryptedError(): Error {
  const err = new Error('The file is encrypted')
  err.name = 'EncryptedPDFError'
  return err
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('真实 PDF 字节通过', async () => {
    expect(isPdfFile(await makePdf())).toBe(true)
  })

  it('非 PDF 字节不通过', () => {
    expect(isPdfFile(new TextEncoder().encode('hello world'))).toBe(false)
  })

  it('过短字节不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
  })
})

describe('isEncryptedPdfError / pdfErrorMessage', () => {
  it('EncryptedPDFError 名称命中', () => {
    expect(isEncryptedPdfError(encryptedError())).toBe(true)
  })

  it('message 含 is encrypted 命中', () => {
    expect(isEncryptedPdfError(new Error('This PDF is encrypted'))).toBe(true)
  })

  it('普通错误不命中', () => {
    expect(isEncryptedPdfError(new Error('boom'))).toBe(false)
  })

  it('非 Error 不命中', () => {
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
  })

  it('pdfErrorMessage：加密走专用文案，其他走 errorMessage', () => {
    expect(pdfErrorMessage(encryptedError(), '已加密')).toBe('已加密')
    expect(pdfErrorMessage(new Error('boom'), '已加密')).toBe('boom')
    expect(pdfErrorMessage('字符串错误', '已加密')).toBe('字符串错误')
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

describe('parseKeywords', () => {
  it('逗号分隔多值', () => {
    expect(parseKeywords('a, b, c')).toEqual(['a', 'b', 'c'])
  })

  it('空串得空数组', () => {
    expect(parseKeywords('')).toEqual([])
  })

  it('连续逗号/首尾逗号/多余空格安全', () => {
    expect(parseKeywords('a,,b, ,c,')).toEqual(['a', 'b', 'c'])
    expect(parseKeywords('  a  ,  b  ')).toEqual(['a', 'b'])
    expect(parseKeywords(',,,')).toEqual([])
  })

  it('单个值', () => {
    expect(parseKeywords('单个')).toEqual(['单个'])
  })
})

describe('joinKeywords', () => {
  it('列表拼回逗号分隔', () => {
    expect(joinKeywords(['a', 'b'])).toBe('a, b')
  })

  it('空数组得空串', () => {
    expect(joinKeywords([])).toBe('')
  })
})

describe('textOrEmpty', () => {
  it('有值原样返回', () => {
    expect(textOrEmpty('标题', '（空）')).toBe('标题')
  })

  it('空串/缺失返回 emptyText', () => {
    expect(textOrEmpty('', '（空）')).toBe('（空）')
    expect(textOrEmpty(undefined, '（空）')).toBe('（空）')
  })
})

describe('formatPdfDate', () => {
  const d = new Date(2024, 0, 15, 10, 30, 45)

  it('缺失返回 emptyText', () => {
    expect(formatPdfDate(undefined, '（空）')).toBe('（空）')
  })

  it('默认中文格式含年份', () => {
    expect(formatPdfDate(d, '（空）')).toContain('2024')
  })

  it('英文格式含年份', () => {
    expect(formatPdfDate(d, '(empty)', 'en')).toContain('2024')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-metadata.pdf')
    expect(buildOutputFileName('a.PDF')).toBe('a-metadata.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-metadata.pdf')
  })

  it('空名兜底为 document', () => {
    expect(buildOutputFileName('')).toBe('document-metadata.pdf')
  })
})

describe('metadataFormSchema', () => {
  it('合法表单通过', () => {
    expect(() =>
      metadataFormSchema.parse({ title: 'T', author: 'A', subject: 'S', keywords: 'k1, k2' }),
    ).not.toThrow()
  })

  it('超长字段被拒绝', () => {
    const over = (n: number) => 'x'.repeat(n)
    expect(() =>
      metadataFormSchema.parse({ title: over(501), author: '', subject: '', keywords: '' }),
    ).toThrow(/标题过长/)
    expect(() =>
      metadataFormSchema.parse({ title: '', author: over(201), subject: '', keywords: '' }),
    ).toThrow(/作者过长/)
    expect(() =>
      metadataFormSchema.parse({ title: '', author: '', subject: over(501), keywords: '' }),
    ).toThrow(/主题过长/)
    expect(() =>
      metadataFormSchema.parse({ title: '', author: '', subject: '', keywords: over(1001) }),
    ).toThrow(/关键字过长/)
  })
})

describe('readPdfMetadata', () => {
  it('完整元数据 round-trip', async () => {
    const bytes = await makePdf({
      title: '测试标题',
      author: '作者',
      subject: '主题',
      keywords: ['a, b'],
      creator: 'CreatorApp',
      producer: 'ProducerApp',
    })
    const meta = await readPdfMetadata(bytes)
    expect(meta.title).toBe('测试标题')
    expect(meta.author).toBe('作者')
    expect(meta.subject).toBe('主题')
    // pdf-lib 写 Keywords 时按空格拼接，读回的是文件里的真实字符串再按逗号拆分
    expect(meta.keywords).toEqual(['a', 'b'])
    expect(meta.creator).toBe('CreatorApp')
    expect(meta.producer).toBe('ProducerApp')
    expect(meta.creationDate).toBeInstanceOf(Date)
    expect(meta.modificationDate).toBeInstanceOf(Date)
    expect(meta.pageCount).toBe(1)
  })

  it('缺失字段为 undefined / 空数组', async () => {
    const meta = await readPdfMetadata(await makePdf())
    expect(meta.title).toBeUndefined()
    expect(meta.author).toBeUndefined()
    expect(meta.subject).toBeUndefined()
    expect(meta.keywords).toEqual([])
  })

  it('多页 PDF 页数正确', async () => {
    const meta = await readPdfMetadata(await makePdf({ pages: 3 }))
    expect(meta.pageCount).toBe(3)
  })

  it('非法日期字符串视为缺失，不抛错', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([300, 200])
    // 注入非法日期，模拟损坏 PDF
    const infoDict = (
      doc as unknown as { getInfoDict(): { set(key: unknown, value: unknown): void } }
    ).getInfoDict()
    infoDict.set(PDFName.of('CreationDate'), PDFString.of('this-is-not-a-date'))
    const bytes = new Uint8Array(await doc.save())
    const meta = await readPdfMetadata(bytes)
    expect(meta.creationDate).toBeUndefined()
  })

  it('加密 PDF 读取失败且可被识别', async () => {
    const bytes = await makeEncryptedMarkerPdf()
    const err = await readPdfMetadata(bytes).catch((e: unknown) => e)
    expect(isEncryptedPdfError(err)).toBe(true)
    expect(pdfErrorMessage(err, '已加密')).toBe('已加密')
  })
})

describe('applyPdfMetadata', () => {
  it('编辑字段生效，未改字段原样保留', async () => {
    const bytes = await makePdf({
      title: '旧标题',
      creator: 'OrigCreator',
      producer: 'OrigProducer',
      pages: 2,
    })
    const { bytes: out, pageCount } = await applyPdfMetadata(bytes, {
      title: '新标题',
      author: '新作者',
      subject: '新主题',
      keywords: ['x', 'y'],
    })
    expect(pageCount).toBe(2)
    const meta = await readPdfMetadata(out)
    expect(meta.title).toBe('新标题')
    expect(meta.author).toBe('新作者')
    expect(meta.subject).toBe('新主题')
    // 未触碰的字段原样保留，没有被 pdf-lib 盖章
    expect(meta.creator).toBe('OrigCreator')
    expect(meta.producer).toBe('OrigProducer')
    expect(meta.producer).not.toContain('pdf-lib')
    expect(meta.pageCount).toBe(2)
  })

  it('清空可编辑字段后 Producer/Creator 无 pdf-lib 字样', async () => {
    const bytes = await makePdf({ title: 'T', creator: 'C', producer: 'P' })
    const { bytes: out } = await applyPdfMetadata(bytes, {
      title: '',
      author: '',
      subject: '',
      keywords: [],
    })
    const meta = await readPdfMetadata(out)
    expect(meta.title).toBe('')
    expect(meta.author).toBe('')
    expect(meta.subject).toBe('')
    expect(meta.keywords).toEqual([])
    expect(meta.creator).toBe('C')
    expect(meta.producer).toBe('P')
  })

  it('0 页 PDF 保存后仍为 0 页（不凭空加白纸）', async () => {
    const bytes = await makePdf({ pages: 0 })
    const { bytes: out, pageCount } = await applyPdfMetadata(bytes, {
      title: 'T',
      author: '',
      subject: '',
      keywords: [],
    })
    expect(pageCount).toBe(0)
    expect((await readPdfMetadata(out)).pageCount).toBe(0)
  })

  it('加密 PDF 写入失败且可被识别', async () => {
    const bytes = await makeEncryptedMarkerPdf()
    const err = await applyPdfMetadata(bytes, {
      title: 'T',
      author: '',
      subject: '',
      keywords: [],
    }).catch((e: unknown) => e)
    expect(isEncryptedPdfError(err)).toBe(true)
  })
})
