import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  mergePdfs,
  moveItem,
  removeItem,
  tryGetPageCount,
} from './utils'

/** 用真实 pdf-lib 在内存构造测试 PDF；每页用不同尺寸以便校验合并顺序 */
async function makePdf(sizes: Array<[number, number]>): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const [w, h] of sizes) doc.addPage([w, h])
  return doc.save()
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('isPdfFile', () => {
  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true)
  })

  it('长度不足 5 字节不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })

  it('逐字节校验：任一字节不对即不通过', () => {
    const good = [0x25, 0x50, 0x44, 0x46, 0x2d]
    for (let i = 0; i < 5; i++) {
      const bad = [...good]
      bad[i] = 0x58 // 'X'
      expect(isPdfFile(new Uint8Array(bad))).toBe(false)
    }
  })

  it('真实 pdf-lib 产物通过校验', async () => {
    expect(isPdfFile(await makePdf([[200, 200]]))).toBe(true)
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

describe('moveItem', () => {
  it('上移/下移交换相邻项，不改原数组', () => {
    const src = ['a', 'b', 'c']
    expect(moveItem(src, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(src, 1, 1)).toEqual(['a', 'c', 'b'])
    expect(src).toEqual(['a', 'b', 'c'])
  })

  it('边界：首项上移、末项下移返回拷贝', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })

  it('非法索引返回拷贝', () => {
    expect(moveItem(['a'], -1, 1)).toEqual(['a'])
    expect(moveItem(['a'], 1, 1)).toEqual(['a'])
    expect(moveItem(['a'], 0.5, 1)).toEqual(['a'])
    expect(moveItem([], 0, 1)).toEqual([])
  })
})

describe('removeItem', () => {
  it('删除指定项，不改原数组', () => {
    const src = ['a', 'b', 'c']
    expect(removeItem(src, 1)).toEqual(['a', 'c'])
    expect(src).toEqual(['a', 'b', 'c'])
  })

  it('非法索引返回拷贝', () => {
    expect(removeItem(['a'], -1)).toEqual(['a'])
    expect(removeItem(['a'], 1)).toEqual(['a'])
    expect(removeItem(['a'], 0.5)).toEqual(['a'])
  })
})

describe('buildOutputFileName', () => {
  it('首文件名 + -merged.pdf', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-merged.pdf')
    expect(buildOutputFileName('a.b.PDF')).toBe('a.b-merged.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-merged.pdf')
  })

  it('空名兜底为 merged', () => {
    expect(buildOutputFileName('')).toBe('merged-merged.pdf')
    expect(buildOutputFileName('.pdf')).toBe('merged-merged.pdf')
  })
})

describe('isEncryptedPdfError', () => {
  it('识别 pdf-lib 的加密错误（按 message 文案，见 utils 注释）', () => {
    expect(isEncryptedPdfError(new Error('Input document to PDFDocument.load is encrypted.'))).toBe(
      true,
    )
  })

  it('其他错误返回 false', () => {
    expect(isEncryptedPdfError(new Error('boom'))).toBe(false)
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('tryGetPageCount', () => {
  it('正常 PDF 返回页数', async () => {
    expect(
      await tryGetPageCount(
        await makePdf([
          [200, 200],
          [300, 300],
        ]),
      ),
    ).toBe(2)
  })

  it('损坏内容返回 null（不抛错）', async () => {
    const junk = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x99, 0x99, 0x99])
    expect(await tryGetPageCount(junk)).toBeNull()
  })
})

describe('mergePdfs', () => {
  it('多文档按顺序拼接，页数与页面尺寸顺序正确', async () => {
    const a = await makePdf([
      [200, 200],
      [210, 210],
    ])
    const b = await makePdf([
      [400, 400],
      [410, 410],
      [420, 420],
    ])
    const merged = await mergePdfs([a, b])
    expect(isPdfFile(merged)).toBe(true)
    const doc = await PDFDocument.load(merged)
    expect(doc.getPageCount()).toBe(5)
    const widths = doc.getPages().map((p) => p.getSize().width)
    expect(widths).toEqual([200, 210, 400, 410, 420])
  })

  it('单个文档合并后页数不变', async () => {
    const a = await makePdf([[200, 300]])
    const doc = await PDFDocument.load(await mergePdfs([a]))
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getPage(0).getSize()).toEqual({ width: 200, height: 300 })
  })

  it('损坏文档抛错（向上传播）', async () => {
    const junk = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x99])
    await expect(mergePdfs([junk])).rejects.toThrow()
  })

  it('返回的是独立的 ArrayBuffer 视图，可直接作 BlobPart', async () => {
    const merged = await mergePdfs([await makePdf([[100, 100]])])
    expect(merged.buffer).toBeInstanceOf(ArrayBuffer)
    expect(
      () => new Blob([merged.buffer as ArrayBuffer], { type: 'application/pdf' }),
    ).not.toThrow()
  })
})
