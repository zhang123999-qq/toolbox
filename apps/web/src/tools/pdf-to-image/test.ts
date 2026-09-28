import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DPI,
  MAX_CANVAS_DIMENSION,
  MAX_CANVAS_PIXELS,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  assertRenderSizeOk,
  buildPageFileName,
  computeScale,
  errorMessage,
  formatToMime,
  isPdfFile,
  parseDpi,
  parsePageSelection,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseDpi', () => {
  it('空串用默认 150', () => {
    expect(parseDpi('')).toBe(DEFAULT_DPI)
    expect(parseDpi('   ')).toBe(DEFAULT_DPI)
    expect(DEFAULT_DPI).toBe('150')
  })

  it('正常解析三档', () => {
    expect(parseDpi('72')).toBe('72')
    expect(parseDpi('150')).toBe('150')
    expect(parseDpi('300')).toBe('300')
    expect(parseDpi(' 300 ')).toBe('300')
  })

  it('非法抛错', () => {
    expect(() => parseDpi('200')).toThrow(/DPI 无效/)
    expect(() => parseDpi('abc')).toThrow(/DPI 无效/)
    expect(() => parseDpi('1500')).toThrow(/DPI 无效/)
  })
})

describe('computeScale', () => {
  it('dpi/72', () => {
    expect(computeScale(72)).toBe(1)
    expect(computeScale(150)).toBe(150 / 72)
    expect(computeScale(300)).toBe(300 / 72)
  })
})

describe('parsePageSelection', () => {
  it('"all" 返回全部页面（不区分大小写、容忍空白）', () => {
    expect(parsePageSelection('all', 3)).toEqual([1, 2, 3])
    expect(parsePageSelection('ALL', 1)).toEqual([1])
    expect(parsePageSelection('  All  ', 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('空选择抛错', () => {
    expect(() => parsePageSelection('', 5)).toThrow(/不能为空/)
    expect(() => parsePageSelection('   ', 5)).toThrow(/不能为空/)
  })

  it('单页与多页逗号分隔', () => {
    expect(parsePageSelection('2', 5)).toEqual([2])
    expect(parsePageSelection('1,3', 5)).toEqual([1, 3])
    expect(parsePageSelection(' 1 , 3 ', 5)).toEqual([1, 3])
  })

  it('范围展开', () => {
    expect(parsePageSelection('5-7', 10)).toEqual([5, 6, 7])
    expect(parsePageSelection('1,3,5-7', 10)).toEqual([1, 3, 5, 6, 7])
    expect(parsePageSelection(' 2 - 4 ', 10)).toEqual([2, 3, 4])
  })

  it('去重并升序', () => {
    expect(parsePageSelection('3,1,3,2-3', 10)).toEqual([1, 2, 3])
    expect(parsePageSelection('5,1', 10)).toEqual([1, 5])
  })

  it('非数字抛错', () => {
    expect(() => parsePageSelection('abc', 5)).toThrow(/页码无效/)
    expect(() => parsePageSelection('1,a', 5)).toThrow(/页码无效/)
    expect(() => parsePageSelection('1.5', 5)).toThrow(/页码无效/)
    expect(() => parsePageSelection('a-3', 5)).toThrow(/页码无效/)
    expect(() => parsePageSelection('3-a', 5)).toThrow(/页码无效/)
  })

  it('空片段抛错', () => {
    expect(() => parsePageSelection('1,,2', 5)).toThrow(/空片段/)
    expect(() => parsePageSelection(',1', 5)).toThrow(/空片段/)
  })

  it('多段范围非法抛错', () => {
    expect(() => parsePageSelection('1-2-3', 10)).toThrow(/范围非法/)
    expect(() => parsePageSelection('5-', 10)).toThrow(/页码无效/)
    expect(() => parsePageSelection('-3', 10)).toThrow(/页码无效/)
  })

  it('范围倒置抛错', () => {
    expect(() => parsePageSelection('7-5', 10)).toThrow(/倒置/)
    expect(parsePageSelection('3-3', 10)).toEqual([3])
  })

  it('页码超范围抛错', () => {
    expect(() => parsePageSelection('0', 5)).toThrow(/超出范围/)
    expect(() => parsePageSelection('6', 5)).toThrow(/超出范围/)
    expect(() => parsePageSelection('4-9', 5)).toThrow(/超出范围/)
    expect(() => parsePageSelection('9-4', 5)).toThrow(/倒置|超出范围/)
  })
})

describe('assertRenderSizeOk', () => {
  it('正常尺寸不抛错', () => {
    expect(() => assertRenderSizeOk(800, 600)).not.toThrow()
    // 恰好等于上限不抛错
    expect(() => assertRenderSizeOk(MAX_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION)).not.toThrow()
    expect(MAX_CANVAS_PIXELS).toBe(MAX_CANVAS_DIMENSION * MAX_CANVAS_DIMENSION)
  })

  it('超限抛错', () => {
    expect(() => assertRenderSizeOk(MAX_CANVAS_DIMENSION + 1, MAX_CANVAS_DIMENSION)).toThrow(/过大/)
    expect(() => assertRenderSizeOk(100000, 100000)).toThrow(/降低 DPI/)
  })

  it('非法尺寸抛错', () => {
    expect(() => assertRenderSizeOk(0, 100)).toThrow(/尺寸无效/)
    expect(() => assertRenderSizeOk(100, -1)).toThrow(/尺寸无效/)
    expect(() => assertRenderSizeOk(NaN, 100)).toThrow(/尺寸无效/)
    expect(() => assertRenderSizeOk(Infinity, 100)).toThrow(/尺寸无效/)
  })
})

describe('formatToMime', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('jpeg')).toBe('image/jpeg')
  })
})

describe('buildPageFileName', () => {
  it('按页码构造文件名', () => {
    expect(buildPageFileName('report', 1, 'png')).toBe('report-p1.png')
    expect(buildPageFileName('report', 12, 'jpeg')).toBe('report-p12.jpg')
  })

  it('空名兜底为 pdf', () => {
    expect(buildPageFileName('', 1, 'png')).toBe('pdf-p1.png')
    expect(buildPageFileName('', 3, 'jpeg')).toBe('pdf-p3.jpg')
  })
})

describe('isPdfFile', () => {
  it('MIME 命中', () => {
    const f = new File(['x'], 'a.bin', { type: 'application/pdf' })
    expect(isPdfFile(f)).toBe(true)
  })

  it('扩展名兜底（不区分大小写）', () => {
    const f = new File(['x'], 'doc.PDF', { type: '' })
    expect(isPdfFile(f)).toBe(true)
  })

  it('非 PDF 返回 false', () => {
    const f = new File(['x'], 'a.txt', { type: 'text/plain' })
    expect(isPdfFile(f)).toBe(false)
    const g = new File(['x'], 'a.png', { type: '' })
    expect(isPdfFile(g)).toBe(false)
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})
