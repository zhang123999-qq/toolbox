import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  MAX_PAGE_COUNT,
  assertFileSizeOk,
  assertPageCountOk,
  buildOutputFileName,
  errorMessage,
  formatPageSize,
  initialOrder,
  isEncryptedPdfError,
  isPdfFile,
  moveItem,
  readPdfInfo,
  reverseOrder,
  sortPdfPages,
} from './utils'

/** 用真实 pdf-lib 生成指定页面尺寸的 PDF */
async function makePdf(pageSizes: [number, number][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const [w, h] of pageSizes) doc.addPage([w, h])
  return await doc.save()
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('真实 PDF 通过魔数校验', async () => {
    expect(isPdfFile(await makePdf([[100, 100]]))).toBe(true)
  })

  it('非 PDF / 过短字节失败', () => {
    expect(isPdfFile(new TextEncoder().encode('hello world'))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44]))).toBe(false)
  })
})

describe('assertFileSizeOk / assertPageCountOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
    expect(() => assertPageCountOk(MAX_PAGE_COUNT)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
    expect(() => assertPageCountOk(MAX_PAGE_COUNT + 1)).toThrow(/页数过多/)
  })
})

describe('isEncryptedPdfError', () => {
  it('message 含 is encrypted 识别为加密错误', () => {
    expect(isEncryptedPdfError(new Error('Input document to PDFDocument.load is encrypted.'))).toBe(
      true,
    )
  })

  it('普通错误与非 Error 返回 false', () => {
    expect(isEncryptedPdfError(new Error('parse failed'))).toBe(false)
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
  })
})

describe('initialOrder', () => {
  it('生成 0..n-1', () => {
    expect(initialOrder(3)).toEqual([0, 1, 2])
    expect(initialOrder(0)).toEqual([])
  })
})

describe('moveItem', () => {
  it('上移/下移交换相邻项', () => {
    expect(moveItem([0, 1, 2], 1, -1)).toEqual([1, 0, 2])
    expect(moveItem([0, 1, 2], 1, 1)).toEqual([0, 2, 1])
  })

  it('边界不动：首项上移 / 末项下移', () => {
    expect(moveItem([0, 1, 2], 0, -1)).toEqual([0, 1, 2])
    expect(moveItem([0, 1, 2], 2, 1)).toEqual([0, 1, 2])
  })

  it('非法索引返回拷贝', () => {
    expect(moveItem([0, 1, 2], -1, 1)).toEqual([0, 1, 2])
    expect(moveItem([0, 1, 2], 3, 1)).toEqual([0, 1, 2])
    expect(moveItem([0, 1, 2], 1.5, 1)).toEqual([0, 1, 2])
  })

  it('不修改原数组', () => {
    const src = [0, 1, 2]
    const next = moveItem(src, 0, 1)
    expect(src).toEqual([0, 1, 2])
    expect(next).not.toBe(src)
  })
})

describe('reverseOrder', () => {
  it('反转并返回拷贝', () => {
    const src = [0, 1, 2]
    const next = reverseOrder(src)
    expect(next).toEqual([2, 1, 0])
    expect(src).toEqual([0, 1, 2])
    expect(next).not.toBe(src)
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -sorted.pdf 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-sorted.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-sorted.pdf')
  })

  it('空名兜底为 sorted', () => {
    expect(buildOutputFileName('')).toBe('sorted-sorted.pdf')
    expect(buildOutputFileName('.pdf')).toBe('sorted-sorted.pdf')
  })
})

describe('formatPageSize', () => {
  it('宽高取整拼接 pt', () => {
    expect(formatPageSize(595.28, 841.89)).toBe('595×842 pt')
    expect(formatPageSize(100, 200)).toBe('100×200 pt')
  })
})

describe('readPdfInfo', () => {
  it('读取页数与每页尺寸', async () => {
    const info = await readPdfInfo(
      await makePdf([
        [100, 100],
        [200, 300],
      ]),
    )
    expect(info.pageCount).toBe(2)
    expect(info.pageSizes).toEqual([
      { width: 100, height: 100 },
      { width: 200, height: 300 },
    ])
  })

  it('损坏数据抛错', async () => {
    await expect(readPdfInfo(new TextEncoder().encode('not a pdf'))).rejects.toThrow()
  })
})

describe('sortPdfPages', () => {
  it('按新顺序重排页面', async () => {
    const bytes = await makePdf([
      [100, 100],
      [200, 200],
      [300, 300],
    ])
    const sorted = await sortPdfPages(bytes, [2, 0, 1])
    const doc = await PDFDocument.load(sorted)
    expect(doc.getPageCount()).toBe(3)
    const sizes = doc.getPages().map((p) => p.getSize())
    expect(sizes.map((s) => s.width)).toEqual([300, 100, 200])
  })

  it('恒等顺序保持原样', async () => {
    const bytes = await makePdf([
      [100, 100],
      [200, 200],
    ])
    const sorted = await sortPdfPages(bytes, [0, 1])
    const doc = await PDFDocument.load(sorted)
    expect(doc.getPages().map((p) => p.getSize().width)).toEqual([100, 200])
  })

  it('顺序长度与页数不符抛错', async () => {
    const bytes = await makePdf([
      [100, 100],
      [200, 200],
    ])
    await expect(sortPdfPages(bytes, [0])).rejects.toThrow(/长度不符/)
    await expect(sortPdfPages(bytes, [0, 1, 2])).rejects.toThrow(/长度不符/)
  })

  it('非法索引抛错：重复 / 越界 / 负数 / 非整数', async () => {
    const bytes = await makePdf([
      [100, 100],
      [200, 200],
    ])
    await expect(sortPdfPages(bytes, [0, 0])).rejects.toThrow(/无效/)
    await expect(sortPdfPages(bytes, [0, 2])).rejects.toThrow(/无效/)
    await expect(sortPdfPages(bytes, [-1, 1])).rejects.toThrow(/无效/)
    await expect(sortPdfPages(bytes, [0.5, 1])).rejects.toThrow(/无效/)
  })

  it('损坏数据抛错', async () => {
    await expect(sortPdfPages(new TextEncoder().encode('not a pdf'), [0])).rejects.toThrow()
  })
})
