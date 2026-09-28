import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  MANY_PAGES_WARN,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  deleteBlockReason,
  deletePages,
  errorMessage,
  invertSelection,
  isPdfFile,
  isValidPageNum,
  parsePageSelection,
  selectAll,
  toggleInSet,
} from './utils'

/** 用真实 pdf-lib 构造指定页数的 PDF */
async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage()
  return new Uint8Array(await doc.save())
}

async function pageCountOf(data: Uint8Array): Promise<number> {
  return (await PDFDocument.load(data)).getPageCount()
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
  it('%PDF- 魔数头识别为 PDF', () => {
    const head = new TextEncoder().encode('%PDF-1.4\n%âãÏÓ\n')
    expect(isPdfFile(head)).toBe(true)
  })

  it('非 PDF 头返回 false', () => {
    expect(isPdfFile(new TextEncoder().encode('hello world'))).toBe(false)
  })

  it('过短数据返回 false', () => {
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
  })
})

describe('isValidPageNum', () => {
  it('合法页码', () => {
    expect(isValidPageNum(1, 5)).toBe(true)
    expect(isValidPageNum(5, 5)).toBe(true)
  })

  it('非法页码', () => {
    expect(isValidPageNum(0, 5)).toBe(false)
    expect(isValidPageNum(6, 5)).toBe(false)
    expect(isValidPageNum(1.5, 5)).toBe(false)
    expect(isValidPageNum(NaN, 5)).toBe(false)
  })
})

describe('parsePageSelection', () => {
  it('all（不区分大小写）返回全部页面', () => {
    expect(parsePageSelection('all', 4)).toEqual([1, 2, 3, 4])
    expect(parsePageSelection(' ALL ', 3)).toEqual([1, 2, 3])
  })

  it('逗号与范围混合，去重升序', () => {
    expect(parsePageSelection('1,3,5-7', 8)).toEqual([1, 3, 5, 6, 7])
    expect(parsePageSelection('3,1,2-3', 4)).toEqual([1, 2, 3])
    expect(parsePageSelection(' 2 , 4 ', 5)).toEqual([2, 4])
  })

  it('空选择抛错', () => {
    expect(() => parsePageSelection('', 4)).toThrow(/不能为空/)
    expect(() => parsePageSelection('   ', 4)).toThrow(/不能为空/)
  })

  it('空片段抛错', () => {
    expect(() => parsePageSelection('1,,3', 4)).toThrow(/空片段/)
    expect(() => parsePageSelection('1,', 4)).toThrow(/空片段/)
  })

  it('非数字抛错', () => {
    expect(() => parsePageSelection('abc', 4)).toThrow(/页码无效/)
    expect(() => parsePageSelection('a-b', 4)).toThrow(/页码无效/)
    expect(() => parsePageSelection('5-b', 8)).toThrow(/页码无效/)
  })

  it('范围格式非法抛错', () => {
    expect(() => parsePageSelection('5-7-9', 10)).toThrow(/范围非法/)
  })

  it('范围倒置抛错', () => {
    expect(() => parsePageSelection('7-5', 10)).toThrow(/倒置/)
  })

  it('页码超范围抛错', () => {
    expect(() => parsePageSelection('0', 4)).toThrow(/超出范围/)
    expect(() => parsePageSelection('9', 4)).toThrow(/超出范围/)
    expect(() => parsePageSelection('6-9', 8)).toThrow(/超出范围/)
  })
})

describe('toggleInSet', () => {
  it('不存在则加入并升序', () => {
    expect(toggleInSet([3, 1], 2)).toEqual([1, 2, 3])
  })

  it('存在则移除', () => {
    expect(toggleInSet([1, 2, 3], 2)).toEqual([1, 3])
  })

  it('不修改原数组', () => {
    const src = [1]
    toggleInSet(src, 2)
    expect(src).toEqual([1])
  })
})

describe('selectAll / invertSelection', () => {
  it('全选返回 1..N', () => {
    expect(selectAll(3)).toEqual([1, 2, 3])
    expect(selectAll(0)).toEqual([])
  })

  it('反选返回未选中的页', () => {
    expect(invertSelection([1, 3], 4)).toEqual([2, 4])
    expect(invertSelection([], 2)).toEqual([1, 2])
    expect(invertSelection([1, 2], 2)).toEqual([])
  })
})

describe('deleteBlockReason', () => {
  it('未选返回 none', () => {
    expect(deleteBlockReason(0, 5)).toBe('none')
  })

  it('全选返回 all（至少保留 1 页）', () => {
    expect(deleteBlockReason(5, 5)).toBe('all')
    expect(deleteBlockReason(6, 5)).toBe('all')
  })

  it('部分选择可删除返回 null', () => {
    expect(deleteBlockReason(2, 5)).toBeNull()
  })
})

describe('deletePages（真实 pdf-lib）', () => {
  it('删除中间页后剩余页正确', async () => {
    const out = await deletePages(await makePdf(5), [1, 3, 5])
    expect(await pageCountOf(out)).toBe(3)
  })

  it('保留页乱序、重复会被归一化', async () => {
    const out = await deletePages(await makePdf(4), [3, 1, 3, 1])
    expect(await pageCountOf(out)).toBe(2)
  })

  it('保留全部页时页数不变', async () => {
    const out = await deletePages(await makePdf(3), [1, 2, 3])
    expect(await pageCountOf(out)).toBe(3)
  })

  it('保留页为空抛错（不能删空）', async () => {
    await expect(deletePages(await makePdf(3), [])).rejects.toThrow(/至少保留 1 页/)
  })

  it('页码越界抛错', async () => {
    await expect(deletePages(await makePdf(3), [1, 9])).rejects.toThrow(/超出范围/)
    await expect(deletePages(await makePdf(3), [0])).rejects.toThrow(/超出范围/)
  })

  it('非 PDF 数据抛错', async () => {
    await expect(deletePages(new TextEncoder().encode('not a pdf'), [1])).rejects.toThrow()
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -deleted.pdf 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-deleted.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-deleted.pdf')
  })

  it('空名兜底为 pdf', () => {
    expect(buildOutputFileName('')).toBe('pdf-deleted.pdf')
    expect(buildOutputFileName('.pdf')).toBe('pdf-deleted.pdf')
  })
})

describe('MANY_PAGES_WARN', () => {
  it('性能提示阈值为 100 页', () => {
    expect(MANY_PAGES_WARN).toBe(100)
  })
})
