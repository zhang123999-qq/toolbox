import { describe, expect, it } from 'vitest'
import {
  A4_SIZE,
  LETTER_SIZE,
  MAX_FILE_SIZE,
  MAX_MARGIN_MM,
  MM_TO_PT,
  assertFileSizeOk,
  buildOutputFileName,
  computePageSize,
  detectEmbedKind,
  errorMessage,
  moveItem,
  parseMarginMm,
  removeItem,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('moveItem', () => {
  it('上移/下移交换相邻项', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('边界移动返回原数组拷贝（不抛错、不改原数组）', () => {
    const list = ['a', 'b', 'c']
    const up = moveItem(list, 0, -1)
    expect(up).toEqual(['a', 'b', 'c'])
    expect(up).not.toBe(list)
    const down = moveItem(list, 2, 1)
    expect(down).toEqual(['a', 'b', 'c'])
    expect(down).not.toBe(list)
    expect(list).toEqual(['a', 'b', 'c'])
  })

  it('索引越界/非整数返回原数组拷贝', () => {
    expect(moveItem(['a', 'b'], 5, -1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], -1, 1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 1.5, -1)).toEqual(['a', 'b'])
    expect(moveItem([], 0, 1)).toEqual([])
  })

  it('返回新数组，原数组引用不变', () => {
    const list = ['a', 'b']
    const next = moveItem(list, 0, 1)
    expect(next).not.toBe(list)
    expect(next).toEqual(['b', 'a'])
  })
})

describe('removeItem', () => {
  it('删除指定项', () => {
    expect(removeItem(['a', 'b', 'c'], 1)).toEqual(['a', 'c'])
    expect(removeItem(['a', 'b'], 0)).toEqual(['b'])
  })

  it('索引越界/非整数返回原数组拷贝', () => {
    const list = ['a', 'b']
    const next = removeItem(list, 5)
    expect(next).toEqual(['a', 'b'])
    expect(next).not.toBe(list)
    expect(removeItem(list, -1)).toEqual(['a', 'b'])
    expect(removeItem(list, 0.5)).toEqual(['a', 'b'])
    expect(list).toEqual(['a', 'b'])
  })
})

describe('parseMarginMm', () => {
  it('空串用默认 0', () => {
    expect(parseMarginMm('')).toBe(0)
    expect(parseMarginMm('   ')).toBe(0)
  })

  it('正常解析（含小数与边界）', () => {
    expect(parseMarginMm('0')).toBe(0)
    expect(parseMarginMm('10')).toBe(10)
    expect(parseMarginMm('2.5')).toBe(2.5)
    expect(parseMarginMm(String(MAX_MARGIN_MM))).toBe(MAX_MARGIN_MM)
    expect(parseMarginMm(' 5 ')).toBe(5)
  })

  it('非法抛错', () => {
    expect(() => parseMarginMm('abc')).toThrow(/页边距无效/)
    expect(() => parseMarginMm('1,000')).toThrow(/页边距无效/)
    expect(() => parseMarginMm('-1')).toThrow(/页边距超出范围/)
    expect(() => parseMarginMm(String(MAX_MARGIN_MM + 1))).toThrow(/页边距超出范围/)
  })
})

describe('computePageSize', () => {
  it('fit 模式：页面 = 图片尺寸 + 两倍边距，图片原样绘制', () => {
    const layout = computePageSize('fit', 800, 600, 0)
    expect(layout).toEqual({ pageW: 800, pageH: 600, drawW: 800, drawH: 600, x: 0, y: 0 })
  })

  it('fit 模式带边距：页面放大，图片居中于边距框内', () => {
    const marginPt = 10 * MM_TO_PT
    const layout = computePageSize('fit', 800, 600, 10)
    expect(layout.pageW).toBeCloseTo(800 + marginPt * 2, 6)
    expect(layout.pageH).toBeCloseTo(600 + marginPt * 2, 6)
    expect(layout.drawW).toBeCloseTo(800, 6)
    expect(layout.drawH).toBeCloseTo(600, 6)
    expect(layout.x).toBeCloseTo(marginPt, 6)
    expect(layout.y).toBeCloseTo(marginPt, 6)
  })

  it('a4 模式：固定页面，横图等比适配并垂直居中', () => {
    const layout = computePageSize('a4', 800, 600, 0)
    expect(layout.pageW).toBe(A4_SIZE.width)
    expect(layout.pageH).toBe(A4_SIZE.height)
    // scale = min(595.28/800, 841.89/600) = 595.28/800
    expect(layout.drawW).toBeCloseTo(595.28, 6)
    expect(layout.drawH).toBeCloseTo(600 * (595.28 / 800), 6)
    expect(layout.x).toBeCloseTo(0, 6)
    expect(layout.y).toBeCloseTo((841.89 - 600 * (595.28 / 800)) / 2, 6)
  })

  it('letter 模式：固定页面，竖图等比适配并水平居中', () => {
    const layout = computePageSize('letter', 600, 800, 0)
    expect(layout.pageW).toBe(LETTER_SIZE.width)
    expect(layout.pageH).toBe(LETTER_SIZE.height)
    // scale = min(612/600, 792/800) = 792/800
    expect(layout.drawW).toBeCloseTo(600 * (792 / 800), 6)
    expect(layout.drawH).toBeCloseTo(792, 6)
    expect(layout.x).toBeCloseTo((612 - 600 * (792 / 800)) / 2, 6)
    expect(layout.y).toBeCloseTo(0, 6)
  })

  it('a4 带边距：可用区域缩小', () => {
    const marginPt = 10 * MM_TO_PT
    const layout = computePageSize('a4', 800, 600, 10)
    expect(layout.pageW).toBe(A4_SIZE.width)
    const availW = 595.28 - marginPt * 2
    expect(layout.drawW).toBeCloseTo(availW, 6)
    expect(layout.x).toBeCloseTo(marginPt, 6)
  })

  it('非法尺寸抛错', () => {
    expect(() => computePageSize('fit', 0, 100, 0)).toThrow(/图片尺寸无效/)
    expect(() => computePageSize('fit', NaN, 100, 0)).toThrow(/图片尺寸无效/)
    expect(() => computePageSize('a4', 100, Infinity, 0)).toThrow(/图片尺寸无效/)
    expect(() => computePageSize('letter', -5, 100, 0)).toThrow(/图片尺寸无效/)
  })
})

describe('buildOutputFileName', () => {
  it('首图名加 -merged.pdf 后缀', () => {
    expect(buildOutputFileName('photo.png')).toBe('photo-merged.pdf')
    expect(buildOutputFileName('a.JPG')).toBe('a-merged.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-merged.pdf')
  })

  it('空名兜底为 images', () => {
    expect(buildOutputFileName('')).toBe('images-merged.pdf')
    expect(buildOutputFileName('.png')).toBe('images-merged.pdf')
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

describe('detectEmbedKind', () => {
  it('jpeg→jpg，png→png', () => {
    expect(detectEmbedKind('image/jpeg')).toBe('jpg')
    expect(detectEmbedKind('image/png')).toBe('png')
  })

  it('大小写/空白不敏感', () => {
    expect(detectEmbedKind('IMAGE/JPEG')).toBe('jpg')
    expect(detectEmbedKind(' image/png ')).toBe('png')
  })

  it('其余格式→convert', () => {
    expect(detectEmbedKind('image/webp')).toBe('convert')
    expect(detectEmbedKind('image/gif')).toBe('convert')
    expect(detectEmbedKind('image/bmp')).toBe('convert')
    expect(detectEmbedKind('image/avif')).toBe('convert')
    expect(detectEmbedKind('')).toBe('convert')
    expect(detectEmbedKind('application/pdf')).toBe('convert')
  })
})
