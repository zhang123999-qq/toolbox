import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_MARGIN,
  DEFAULT_START_NUMBER,
  MAX_FILE_SIZE,
  MAX_FONT_SIZE,
  MAX_MARGIN,
  MAX_START_NUMBER,
  MIN_FONT_SIZE,
  MIN_MARGIN,
  addPageNumbers,
  assertFileSizeOk,
  assertFromPageInRange,
  assertPdfFile,
  buildOutputFileName,
  calcPosition,
  computePageIndices,
  errorMessage,
  estimateTextWidth,
  formatPageNumber,
  isEncryptedPdfError,
  isPdfFile,
  loadErrorMessage,
  parseFontSize,
  parseFromPage,
  parseMargin,
  parseStartNumber,
} from './utils'

/** 用真实 pdf-lib 生成 n 页测试 PDF */
async function makePdfBytes(pages = 3): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([595, 842])
  const saved: Uint8Array = await doc.save()
  return new Uint8Array(saved)
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile / assertPdfFile', () => {
  it('识别 %PDF- 魔数', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true)
  })

  it('短于 5 字节不是 PDF', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
  })

  it('魔数不符不是 PDF', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x58]))).toBe(false)
  })

  it('assertPdfFile 通过/抛错', () => {
    expect(() => assertPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).not.toThrow()
    expect(() => assertPdfFile(new Uint8Array([1, 2, 3]))).toThrow(/不是有效的 PDF 文件/)
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

describe('isEncryptedPdfError / loadErrorMessage', () => {
  it('message 含 is encrypted 即为加密错误', () => {
    expect(
      isEncryptedPdfError(new Error('Input document to `PDFDocument.load` is encrypted.')),
    ).toBe(true)
  })

  it('普通 Error 不是加密错误', () => {
    expect(isEncryptedPdfError(new Error('Invalid PDF structure'))).toBe(false)
  })

  it('非 Error 不是加密错误', () => {
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
  })

  it('加密错误转译为明确中文', () => {
    expect(loadErrorMessage(new Error('file is encrypted'))).toBe('PDF 已加密，不支持添加页码')
  })

  it('其他错误透出原始信息', () => {
    expect(loadErrorMessage(new Error('坏了'))).toBe('PDF 读取失败：坏了')
  })
})

describe('parseStartNumber', () => {
  it('空串用默认 1', () => {
    expect(parseStartNumber('')).toBe(DEFAULT_START_NUMBER)
    expect(parseStartNumber('   ')).toBe(DEFAULT_START_NUMBER)
  })

  it('正常解析（含 0）', () => {
    expect(parseStartNumber('0')).toBe(0)
    expect(parseStartNumber('5')).toBe(5)
    expect(parseStartNumber(' 42 ')).toBe(42)
  })

  it('非法抛错', () => {
    expect(() => parseStartNumber('abc')).toThrow(/起始编号无效/)
    expect(() => parseStartNumber('1.5')).toThrow(/起始编号无效/)
    expect(() => parseStartNumber('-1')).toThrow(/起始编号无效/)
    expect(() => parseStartNumber(String(MAX_START_NUMBER + 1))).toThrow(/起始编号过大/)
  })
})

describe('parseFromPage', () => {
  it('空串用默认 1', () => {
    expect(parseFromPage('')).toBe(1)
  })

  it('正常解析', () => {
    expect(parseFromPage('3')).toBe(3)
  })

  it('非法抛错', () => {
    expect(() => parseFromPage('abc')).toThrow(/起始页无效/)
    expect(() => parseFromPage('0')).toThrow(/≥1/)
    expect(() => parseFromPage('2.5')).toThrow(/起始页无效/)
  })
})

describe('parseFontSize', () => {
  it('空串用默认 12', () => {
    expect(parseFontSize('')).toBe(DEFAULT_FONT_SIZE)
  })

  it('边界值通过', () => {
    expect(parseFontSize(String(MIN_FONT_SIZE))).toBe(MIN_FONT_SIZE)
    expect(parseFontSize(String(MAX_FONT_SIZE))).toBe(MAX_FONT_SIZE)
    expect(parseFontSize('24')).toBe(24)
  })

  it('非法抛错', () => {
    expect(() => parseFontSize('abc')).toThrow(/字号无效/)
    expect(() => parseFontSize(String(MIN_FONT_SIZE - 1))).toThrow(/字号超出范围/)
    expect(() => parseFontSize(String(MAX_FONT_SIZE + 1))).toThrow(/字号超出范围/)
  })
})

describe('parseMargin', () => {
  it('空串用默认 36', () => {
    expect(parseMargin('')).toBe(DEFAULT_MARGIN)
  })

  it('边界值通过', () => {
    expect(parseMargin(String(MIN_MARGIN))).toBe(MIN_MARGIN)
    expect(parseMargin(String(MAX_MARGIN))).toBe(MAX_MARGIN)
    expect(parseMargin('50')).toBe(50)
  })

  it('非法抛错', () => {
    expect(() => parseMargin('abc')).toThrow(/边距无效/)
    expect(() => parseMargin(String(MAX_MARGIN + 1))).toThrow(/边距超出范围/)
  })
})

describe('assertFromPageInRange', () => {
  it('范围内不抛错', () => {
    expect(() => assertFromPageInRange(1, 3)).not.toThrow()
    expect(() => assertFromPageInRange(3, 3)).not.toThrow()
  })

  it('超出总页数抛错', () => {
    expect(() => assertFromPageInRange(4, 3)).toThrow(/超出总页数/)
  })
})

describe('formatPageNumber', () => {
  it('三种样式', () => {
    expect(formatPageNumber('n', 3, 10)).toBe('3')
    expect(formatPageNumber('nOfN', 3, 10)).toBe('3/10')
    expect(formatPageNumber('page', 3, 10)).toBe('page 3')
  })

  it('起始编号参与格式化', () => {
    expect(formatPageNumber('nOfN', 7, 10)).toBe('7/10')
  })
})

describe('computePageIndices', () => {
  it('从第 1 页起为全部下标', () => {
    expect(computePageIndices(1, 3)).toEqual([0, 1, 2])
  })

  it('从中间页起只含后续下标', () => {
    expect(computePageIndices(2, 3)).toEqual([1, 2])
    expect(computePageIndices(3, 3)).toEqual([2])
  })
})

describe('estimateTextWidth', () => {
  const size = 10

  it('数字按 0.556em 等宽估算', () => {
    expect(estimateTextWidth('30', size)).toBeCloseTo(2 * 0.556 * size, 10)
  })

  it('斜杠/空格/点按 0.278em', () => {
    expect(estimateTextWidth('3/10', size)).toBeCloseTo((3 * 0.556 + 0.278) * size, 10)
    expect(estimateTextWidth('a b.c', size)).toBeCloseTo((3 * 0.55 + 2 * 0.278) * size, 10)
  })

  it('小写字母按 0.55em', () => {
    expect(estimateTextWidth('page', size)).toBeCloseTo(4 * 0.55 * size, 10)
  })

  it('大写字母按 0.67em', () => {
    expect(estimateTextWidth('AB', size)).toBeCloseTo(2 * 0.67 * size, 10)
  })

  it('其他字符按 0.5em 兜底', () => {
    expect(estimateTextWidth('-', size)).toBeCloseTo(0.5 * size, 10)
  })
})

describe('calcPosition', () => {
  // 页 595×842，字号 12，边距 36，文本宽 100
  const W = 595
  const H = 842
  const TW = 100
  const FS = 12
  const M = 36

  it('左下 / 左上', () => {
    expect(calcPosition('bottomLeft', W, H, TW, FS, M)).toEqual({ x: 36, y: 36 })
    expect(calcPosition('topLeft', W, H, TW, FS, M)).toEqual({ x: 36, y: 842 - 36 - 12 })
  })

  it('中下 / 中上', () => {
    expect(calcPosition('bottomCenter', W, H, TW, FS, M)).toEqual({ x: (595 - 100) / 2, y: 36 })
    expect(calcPosition('topCenter', W, H, TW, FS, M)).toEqual({
      x: (595 - 100) / 2,
      y: 842 - 36 - 12,
    })
  })

  it('右下 / 右上', () => {
    expect(calcPosition('bottomRight', W, H, TW, FS, M)).toEqual({ x: 595 - 36 - 100, y: 36 })
    expect(calcPosition('topRight', W, H, TW, FS, M)).toEqual({ x: 595 - 36 - 100, y: 794 })
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -pagenumber.pdf 后缀', () => {
    expect(buildOutputFileName('doc.pdf')).toBe('doc-pagenumber.pdf')
    expect(buildOutputFileName('report.PDF')).toBe('report-pagenumber.pdf')
  })

  it('无扩展名直接拼接', () => {
    expect(buildOutputFileName('noext')).toBe('noext-pagenumber.pdf')
  })

  it('空名兜底为 numbered', () => {
    expect(buildOutputFileName('')).toBe('numbered-pagenumber.pdf')
  })
})

describe('addPageNumbers（真实 pdf-lib）', () => {
  it('从第 2 页起加页码，输出可正常载入且页数不变', async () => {
    const bytes = await makePdfBytes(3)
    const out = await addPageNumbers(bytes, {
      position: 'bottomCenter',
      style: 'nOfN',
      startNumber: 5,
      fromPage: 2,
      fontSize: 12,
      margin: 36,
    })
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(3)
    expect(out.length).toBeGreaterThan(0)
  })

  it('6 档位置 × 3 种样式均可绘制', async () => {
    const bytes = await makePdfBytes(2)
    const positions = [
      'topLeft',
      'topCenter',
      'topRight',
      'bottomLeft',
      'bottomCenter',
      'bottomRight',
    ] as const
    const styles = ['n', 'nOfN', 'page'] as const
    for (const position of positions) {
      for (const style of styles) {
        const out = await addPageNumbers(bytes, {
          position,
          style,
          startNumber: 1,
          fromPage: 1,
          fontSize: 10,
          margin: 20,
        })
        const doc = await PDFDocument.load(out)
        expect(doc.getPageCount()).toBe(2)
      }
    }
  })

  it('起始编号 0 可用', async () => {
    const bytes = await makePdfBytes(1)
    const out = await addPageNumbers(bytes, {
      position: 'topRight',
      style: 'n',
      startNumber: 0,
      fromPage: 1,
      fontSize: 12,
      margin: 36,
    })
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })

  it('起始页超出总页数时拒绝', async () => {
    const bytes = await makePdfBytes(3)
    await expect(
      addPageNumbers(bytes, {
        position: 'bottomCenter',
        style: 'n',
        startNumber: 1,
        fromPage: 4,
        fontSize: 12,
        margin: 36,
      }),
    ).rejects.toThrow(/超出总页数/)
  })

  it('非 PDF 字节直接抛错', async () => {
    await expect(
      addPageNumbers(new Uint8Array([1, 2, 3, 4, 5]), {
        position: 'bottomCenter',
        style: 'n',
        startNumber: 1,
        fromPage: 1,
        fontSize: 12,
        margin: 36,
      }),
    ).rejects.toThrow()
  })
})
