import { describe, expect, it } from 'vitest'
import { EncryptedPDFError, PDFDocument, degrees } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  normalizeAngle,
  parsePageRanges,
  rotatePdf,
} from './utils'

/** 用真实 pdf-lib 构造测试 PDF；rotations[i] 为第 i 页的预置旋转角度 */
async function makePdf(pageCount: number, rotations: number[] = []): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([600, 800])
    const r = rotations[i] ?? 0
    if (r !== 0) page.setRotation(degrees(r))
  }
  return new Uint8Array(await doc.save())
}

/** 读取 PDF 各页旋转角度 */
async function pageAngles(data: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(data)
  return doc.getPages().map((p) => p.getRotation().angle)
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
  it('%PDF- 魔数头识别', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true)
  })

  it('非 PDF 头返回 false', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x58]))).toBe(false)
    expect(isPdfFile(new Uint8Array([1, 2, 3, 4, 5, 6]))).toBe(false)
  })

  it('过短返回 false', () => {
    expect(isPdfFile(new Uint8Array([]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
  })
})

describe('isEncryptedPdfError', () => {
  it('真实 EncryptedPDFError 识别（按消息匹配）', () => {
    expect(isEncryptedPdfError(new EncryptedPDFError())).toBe(true)
  })

  it('按错误名识别', () => {
    const err = new Error('whatever')
    err.name = 'EncryptedPDFError'
    expect(isEncryptedPdfError(err)).toBe(true)
  })

  it('普通错误与非 Error 返回 false', () => {
    expect(isEncryptedPdfError(new Error('解析失败'))).toBe(false)
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('parsePageRanges', () => {
  it('单页与范围混合解析，去重升序', () => {
    expect(parsePageRanges('1-3,5', 10)).toEqual([1, 2, 3, 5])
    expect(parsePageRanges('5,2', 10)).toEqual([2, 5])
    expect(parsePageRanges('3,1-3,2', 10)).toEqual([1, 2, 3])
    expect(parsePageRanges(' 1 - 3 , 5 ', 10)).toEqual([1, 2, 3, 5])
  })

  it('边界页码', () => {
    expect(parsePageRanges('1', 1)).toEqual([1])
    expect(parsePageRanges('1-10', 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('页数无效抛错', () => {
    expect(() => parsePageRanges('1', 0)).toThrow(/页数无效/)
    expect(() => parsePageRanges('1', -2)).toThrow(/页数无效/)
    expect(() => parsePageRanges('1', 1.5)).toThrow(/页数无效/)
    expect(() => parsePageRanges('1', NaN)).toThrow(/页数无效/)
  })

  it('空输入抛错', () => {
    expect(() => parsePageRanges('', 10)).toThrow(/不能为空/)
    expect(() => parsePageRanges('   ', 10)).toThrow(/不能为空/)
  })

  it('空片段抛错', () => {
    expect(() => parsePageRanges('1,,3', 10)).toThrow(/空片段/)
    expect(() => parsePageRanges('1,', 10)).toThrow(/空片段/)
    expect(() => parsePageRanges(',1', 10)).toThrow(/空片段/)
  })

  it('非数字抛错', () => {
    expect(() => parsePageRanges('a', 10)).toThrow(/页码无效/)
    expect(() => parsePageRanges('1.5', 10)).toThrow(/页码无效/)
    expect(() => parsePageRanges('-3', 10)).toThrow(/页码范围无效/)
    expect(() => parsePageRanges('3-', 10)).toThrow(/页码范围无效/)
    expect(() => parsePageRanges('1-2-3', 10)).toThrow(/页码范围无效/)
    expect(() => parsePageRanges('1-x', 10)).toThrow(/页码范围无效/)
  })

  it('范围倒置抛错', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow(/倒置/)
  })

  it('页码超范围抛错', () => {
    expect(() => parsePageRanges('0', 10)).toThrow(/超出范围/)
    expect(() => parsePageRanges('11', 10)).toThrow(/超出范围/)
    expect(() => parsePageRanges('0-2', 10)).toThrow(/超出范围/)
    expect(() => parsePageRanges('2-11', 10)).toThrow(/超出范围/)
  })
})

describe('normalizeAngle', () => {
  it('合法角度原样返回', () => {
    expect(normalizeAngle(90)).toBe(90)
    expect(normalizeAngle(180)).toBe(180)
    expect(normalizeAngle(270)).toBe(270)
  })

  it('取模归一化', () => {
    expect(normalizeAngle(360)).toBe(0)
    expect(normalizeAngle(450)).toBe(90)
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(-180)).toBe(180)
    expect(normalizeAngle(0)).toBe(0)
  })

  it('非法抛错', () => {
    expect(() => normalizeAngle(45)).toThrow(/角度无效/)
    expect(() => normalizeAngle(100)).toThrow(/角度无效/)
    expect(() => normalizeAngle(NaN)).toThrow(/角度无效/)
    expect(() => normalizeAngle(Infinity)).toThrow(/角度无效/)
  })
})

describe('rotatePdf', () => {
  it('旋转指定页面，其余不动', async () => {
    const data = await makePdf(4)
    const out = await rotatePdf(data, [1, 3], 90)
    expect(await pageAngles(out)).toEqual([90, 0, 90, 0])
  })

  it('角度累加取模：预置 90° 的页再转 270° → 0°', async () => {
    const data = await makePdf(2, [90, 270])
    const out = await rotatePdf(data, [1, 2], 270)
    // (90+270)%360=0，(270+270)%360=180
    expect(await pageAngles(out)).toEqual([0, 180])
  })

  it('180° 旋转与累加', async () => {
    const data = await makePdf(1, [180])
    const out = await rotatePdf(data, [1], 180)
    expect(await pageAngles(out)).toEqual([0])
  })

  it('空页码列表：原样返回有效 PDF', async () => {
    const data = await makePdf(2)
    const out = await rotatePdf(data, [], 90)
    expect(await pageAngles(out)).toEqual([0, 0])
    expect(isPdfFile(out)).toBe(true)
  })

  it('重复页码只旋转一次（去重）', async () => {
    const data = await makePdf(1)
    const out = await rotatePdf(data, [1, 1, 1], 90)
    expect(await pageAngles(out)).toEqual([90])
  })

  it('页码非法抛错', async () => {
    const data = await makePdf(3)
    await expect(rotatePdf(data, [0], 90)).rejects.toThrow(/超出范围/)
    await expect(rotatePdf(data, [4], 90)).rejects.toThrow(/超出范围/)
    await expect(rotatePdf(data, [1.5], 90)).rejects.toThrow(/超出范围/)
  })

  it('角度非法抛错', async () => {
    const data = await makePdf(1)
    await expect(rotatePdf(data, [1], 45)).rejects.toThrow(/角度无效/)
  })

  it('非 PDF 数据加载失败', async () => {
    await expect(rotatePdf(new Uint8Array([1, 2, 3]), [1], 90)).rejects.toThrow()
  })
})

describe('buildOutputFileName', () => {
  it('原名 + -rotated.pdf', () => {
    expect(buildOutputFileName('doc.pdf')).toBe('doc-rotated.pdf')
    expect(buildOutputFileName('my.report.PDF')).toBe('my.report-rotated.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-rotated.pdf')
  })

  it('空名兜底', () => {
    expect(buildOutputFileName('')).toBe('document-rotated.pdf')
    expect(buildOutputFileName('.pdf')).toBe('document-rotated.pdf')
  })
})
