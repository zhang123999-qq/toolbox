import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  buildSplitGroups,
  errorMessage,
  getPdfPageCount,
  isPdfFile,
  loadPdfDocument,
  parseChunkSize,
  parsePageRanges,
  parseRangesToGroups,
  splitPdf,
} from './utils'

/** 用真实 pdf-lib 构造 N 页测试 PDF */
async function makeTestPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([595, 842])
  return doc.save()
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
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

describe('isPdfFile', () => {
  it('%PDF 魔数判定', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]))).toBe(true)
  })

  it('非 PDF 返回 false', () => {
    expect(isPdfFile(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe(false)
    expect(isPdfFile(new Uint8Array([]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
  })
})

describe('parsePageRanges（核心）', () => {
  it('正常解析：范围 + 单页，去重排序', () => {
    expect(parsePageRanges('1-3,5,8-10', 12)).toEqual([1, 2, 3, 5, 8, 9, 10])
  })

  it('重复页码去重', () => {
    expect(parsePageRanges('1-3,2,3-5', 10)).toEqual([1, 2, 3, 4, 5])
  })

  it('空格容忍', () => {
    expect(parsePageRanges(' 1 - 3 , 5 ', 10)).toEqual([1, 2, 3, 5])
  })

  it('单页与边界页', () => {
    expect(parsePageRanges('1', 10)).toEqual([1])
    expect(parsePageRanges('10', 10)).toEqual([10])
  })

  it('空输入抛错', () => {
    expect(() => parsePageRanges('', 10)).toThrow(/不能为空/)
    expect(() => parsePageRanges('   ', 10)).toThrow(/不能为空/)
  })

  it('空片段抛错', () => {
    expect(() => parsePageRanges('1,,2', 10)).toThrow(/空片段/)
    expect(() => parsePageRanges('1,', 10)).toThrow(/空片段/)
  })

  it('非法 token 抛错', () => {
    expect(() => parsePageRanges('abc', 10)).toThrow(/页码无效/)
    expect(() => parsePageRanges('1.5', 10)).toThrow(/页码无效/)
    expect(() => parsePageRanges('1-2-3', 10)).toThrow(/范围非法/)
  })

  it('逆序范围抛错', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow(/倒置/)
  })

  it('超范围页码抛错', () => {
    expect(() => parsePageRanges('0', 10)).toThrow(/超出范围/)
    expect(() => parsePageRanges('11', 10)).toThrow(/超出范围/)
    expect(() => parsePageRanges('1-11', 10)).toThrow(/超出范围/)
  })

  it('PDF 页数非法抛错', () => {
    expect(() => parsePageRanges('1', 0)).toThrow(/页数无效/)
    expect(() => parsePageRanges('1', 1.5)).toThrow(/页数无效/)
  })
})

describe('parseRangesToGroups', () => {
  it('每个逗号片段独立成组', () => {
    expect(parseRangesToGroups('1-3,5,8-10', 12)).toEqual([[1, 2, 3], [5], [8, 9, 10]])
  })

  it('片段内去重排序', () => {
    expect(() => parseRangesToGroups('3-1', 10)).toThrow(/倒置/)
    expect(parseRangesToGroups('5,3,5', 10)).toEqual([[5], [3], [5]])
  })

  it('非法输入抛错', () => {
    expect(() => parseRangesToGroups('', 10)).toThrow(/不能为空/)
    expect(() => parseRangesToGroups('2,', 10)).toThrow(/空片段/)
  })
})

describe('parseChunkSize', () => {
  it('正常解析', () => {
    expect(parseChunkSize('1')).toBe(1)
    expect(parseChunkSize(' 3 ')).toBe(3)
  })

  it('非法抛错', () => {
    expect(() => parseChunkSize('')).toThrow(/不能为空/)
    expect(() => parseChunkSize('abc')).toThrow(/每份页数无效/)
    expect(() => parseChunkSize('2.5')).toThrow(/每份页数无效/)
    expect(() => parseChunkSize('0')).toThrow(/每份页数无效/)
  })
})

describe('buildSplitGroups', () => {
  it('ranges 模式：片段分组', () => {
    expect(buildSplitGroups('ranges', '1-2,5', '', 10)).toEqual([[1, 2], [5]])
  })

  it('chunks 模式：每 N 页一组，末组可不足 N 页', () => {
    expect(buildSplitGroups('chunks', '', '3', 10)).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]])
  })

  it('chunks 模式：N 大于总页数时整份一组', () => {
    expect(buildSplitGroups('chunks', '', '20', 5)).toEqual([[1, 2, 3, 4, 5]])
  })

  it('single 模式：每页一组', () => {
    expect(buildSplitGroups('single', '', '', 3)).toEqual([[1], [2], [3]])
  })
})

describe('buildOutputFileName', () => {
  it('范围后缀', () => {
    expect(buildOutputFileName('doc.pdf', 1, 3)).toBe('doc-p1-3.pdf')
  })

  it('单页后缀', () => {
    expect(buildOutputFileName('doc.pdf', 5, 5)).toBe('doc-p5.pdf')
  })

  it('无扩展名与空名兜底', () => {
    expect(buildOutputFileName('report', 2, 4)).toBe('report-p2-4.pdf')
    expect(buildOutputFileName('', 1, 1)).toBe('pdf-p1.pdf')
    expect(buildOutputFileName('.pdf', 1, 2)).toBe('pdf-p1-2.pdf')
  })
})

describe('loadPdfDocument / getPdfPageCount（真实 pdf-lib）', () => {
  it('正常 PDF 读取页数', async () => {
    const data = await makeTestPdf(6)
    expect(await getPdfPageCount(data)).toBe(6)
  })

  it('损坏数据原样抛错（非加密）', async () => {
    await expect(loadPdfDocument(new Uint8Array([1, 2, 3]))).rejects.toThrow()
  })
})

describe('splitPdf（真实 pdf-lib）', () => {
  it('三种分组拆分后每份页数正确', async () => {
    const data = await makeTestPdf(6)
    const outputs = await splitPdf(data, [[1, 2], [3], [4, 5, 6]])
    expect(outputs).toHaveLength(3)
    const counts = await Promise.all(outputs.map((bytes) => getPdfPageCount(bytes)))
    expect(counts).toEqual([2, 1, 3])
  })

  it('单页逐个拆分：6 页 → 6 个单页 PDF', async () => {
    const data = await makeTestPdf(6)
    const groups = buildSplitGroups('single', '', '', 6)
    const outputs = await splitPdf(data, groups)
    expect(outputs).toHaveLength(6)
    for (const bytes of outputs) {
      expect(await getPdfPageCount(bytes)).toBe(1)
    }
  })

  it('空分组返回空数组', async () => {
    const data = await makeTestPdf(2)
    expect(await splitPdf(data, [])).toEqual([])
  })
})
