import { describe, expect, it } from 'vitest'
import { PasswordException, PasswordResponses } from 'pdfjs-dist'
import {
  MAX_FILE_SIZE,
  MAX_SLIDE_INCHES,
  MIN_SLIDE_INCHES,
  PT_PER_INCH,
  assertFileSizeOk,
  buildOutputFileName,
  computeSlideLayout,
  errorMessage,
  fitBoxToLayout,
  isEncryptedPdfError,
  isPdfFile,
  itemsToTextBoxes,
} from './utils'
import type { TextBox, TextContentItem } from './utils'

/** 构造文本条目：transform [fs,0,0,fs,x,y]，默认宽度按 0.5em 估算 */
function ti(str: string, x: number, y: number, fontSize = 12, width?: number): TextContentItem {
  return {
    str,
    transform: [fontSize, 0, 0, fontSize, x, y],
    width: width ?? str.length * fontSize * 0.5,
    height: fontSize,
  }
}

const PAGE_H = 792

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  const bytes = (s: string) => new TextEncoder().encode(s)

  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(bytes('%PDF-1.4'))).toBe(true)
  })

  it('长度不足 5 字节不通过', () => {
    expect(isPdfFile(bytes('%PDF'))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })

  it('逐字节位置错误都不通过', () => {
    expect(isPdfFile(bytes('\x89PDF-1.4'))).toBe(false) // 第 1 字节
    expect(isPdfFile(bytes('%QDF-1.4'))).toBe(false) // 第 2 字节
    expect(isPdfFile(bytes('%PXF-1.4'))).toBe(false) // 第 3 字节
    expect(isPdfFile(bytes('%PDX-1.4'))).toBe(false) // 第 4 字节
    expect(isPdfFile(bytes('%PDF+1.4'))).toBe(false) // 第 5 字节
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

describe('isEncryptedPdfError', () => {
  it('pdfjs PasswordException 识别为加密', () => {
    const err = new PasswordException('No password given', PasswordResponses.NEED_PASSWORD)
    expect(isEncryptedPdfError(err)).toBe(true)
  })

  it('name 为 PasswordException 的 Error 也识别（跨 realm 兜底）', () => {
    const err = new Error('no password')
    err.name = 'PasswordException'
    expect(isEncryptedPdfError(err)).toBe(true)
  })

  it('普通错误与非 Error 不识别', () => {
    expect(isEncryptedPdfError(new Error('Invalid PDF'))).toBe(false)
    expect(isEncryptedPdfError('PasswordException')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('itemsToTextBoxes', () => {
  it('空数组返回空数组', () => {
    expect(itemsToTextBoxes([], PAGE_H)).toEqual([])
  })

  it('跳过 marked content 与空串条目', () => {
    const items: TextContentItem[] = [
      { type: 'beginMarkedContent', id: 'm1' },
      { str: '', transform: [12, 0, 0, 12, 0, 0], width: 0, height: 12 },
      ti('Hi', 72, 700),
    ]
    const boxes = itemsToTextBoxes(items, PAGE_H)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].text).toBe('Hi')
  })

  it('单文本框几何：PDF 点坐标 → 英寸（y 翻转）', () => {
    // x=72pt→1in；y=(792-700-12×0.85)/72=81.8/72；w=30/72；h=12×1.2/72=0.2
    const [box] = itemsToTextBoxes([ti('Hello', 72, 700, 12, 30)], PAGE_H)
    expect(box.text).toBe('Hello')
    expect(box.x).toBeCloseTo(1, 10)
    expect(box.y).toBeCloseTo(81.8 / PT_PER_INCH, 10)
    expect(box.w).toBeCloseTo(30 / PT_PER_INCH, 10)
    expect(box.h).toBeCloseTo(0.2, 10)
    expect(box.fontSize).toBe(12)
  })

  it('同行多片段按 x 排序、间隔大补空格', () => {
    const items = [ti('World', 110, 700, 12, 30), ti('Hello', 72, 700, 12, 30)]
    const [box] = itemsToTextBoxes(items, PAGE_H)
    // 间隔 110-(72+30)=8 > 12×0.25=3，补空格
    expect(box.text).toBe('Hello World')
    expect(box.x).toBeCloseTo(1, 10)
    expect(box.w).toBeCloseTo(68 / PT_PER_INCH, 10)
  })

  it('间隔小不补空格', () => {
    const items = [ti('Hello', 72, 700, 12, 30), ti('World', 104, 700, 12, 30)]
    const [box] = itemsToTextBoxes(items, PAGE_H)
    // 间隔 104-(72+30)=2 < 3，不补
    expect(box.text).toBe('HelloWorld')
  })

  it('前片段尾随空格时不重复补', () => {
    const items = [ti('Hello ', 72, 700, 12, 36), ti('World', 116, 700, 12, 30)]
    const [box] = itemsToTextBoxes(items, PAGE_H)
    expect(box.text).toBe('Hello World')
  })

  it('后片段前导空格时不重复补', () => {
    const items = [ti('Hello', 72, 700, 12, 30), ti(' World', 110, 700, 12, 36)]
    const [box] = itemsToTextBoxes(items, PAGE_H)
    expect(box.text).toBe('Hello World')
  })

  it('不同行按基线 y 降序（页顶在前）', () => {
    const items = [ti('第二行', 72, 680, 12, 36), ti('第一行', 72, 700, 12, 36)]
    const boxes = itemsToTextBoxes(items, PAGE_H)
    expect(boxes.map((b) => b.text)).toEqual(['第一行', '第二行'])
  })

  it('基线差在容差内视为同行', () => {
    // Δy=4 ≤ max(1, 12×0.5)=6，同行；间隔 90-(72+10)=8 > 3 补空格
    const items = [ti('A', 72, 700, 12, 10), ti('B', 90, 696, 12, 10)]
    const boxes = itemsToTextBoxes(items, PAGE_H)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].text).toBe('A B')
  })

  it('基线差超出容差另起一行', () => {
    // Δy=7 > 6，另起一行
    const items = [ti('A', 72, 700, 12, 10), ti('B', 90, 693, 12, 10)]
    const boxes = itemsToTextBoxes(items, PAGE_H)
    expect(boxes.map((b) => b.text)).toEqual(['A', 'B'])
  })

  it('后片段落在前片段范围内时包围盒取最大右端', () => {
    // 'Long' 占 72–172pt，'x' 在 80–90pt 内：重叠不补空格，右端仍为 172
    const items = [ti('Long', 72, 700, 12, 100), ti('x', 80, 700, 12, 10)]
    const [box] = itemsToTextBoxes(items, PAGE_H)
    expect(box.text).toBe('Longx')
    expect(box.w).toBeCloseTo(100 / PT_PER_INCH, 10)
  })

  it('字号回退：d=0 时取 |a|', () => {
    const item: TextContentItem = {
      str: 'R',
      transform: [10, 0, 0, 0, 72, 700],
      width: 8,
      height: 10,
    }
    const [box] = itemsToTextBoxes([item], PAGE_H)
    expect(box.fontSize).toBe(10)
    expect(box.h).toBeCloseTo((10 * 1.2) / PT_PER_INCH, 10)
  })

  it('字号回退：全零变换时兜底 12pt', () => {
    const item: TextContentItem = {
      str: 'Z',
      transform: [0, 0, 0, 0, 72, 700],
      width: 8,
      height: 0,
    }
    const [box] = itemsToTextBoxes([item], PAGE_H)
    expect(box.fontSize).toBe(12)
  })

  it('宽度信息缺失（0 宽）时保底 0.6em 框宽', () => {
    const [box] = itemsToTextBoxes([ti('Hi', 72, 700, 12, 0)], PAGE_H)
    expect(box.w).toBeCloseTo((12 * 0.6) / PT_PER_INCH, 10)
  })
})

describe('computeSlideLayout', () => {
  it('点 → 英寸换算', () => {
    const layout = computeSlideLayout({ width: 595.28, height: 841.89 })
    expect(layout.width).toBeCloseTo(595.28 / PT_PER_INCH, 6)
    expect(layout.height).toBeCloseTo(841.89 / PT_PER_INCH, 6)
  })

  it('超大页面钳制到上限', () => {
    expect(computeSlideLayout({ width: 7200, height: 7200 })).toEqual({
      width: MAX_SLIDE_INCHES,
      height: MAX_SLIDE_INCHES,
    })
  })

  it('过小页面放大到下限', () => {
    expect(computeSlideLayout({ width: 36, height: 36 })).toEqual({
      width: MIN_SLIDE_INCHES,
      height: MIN_SLIDE_INCHES,
    })
  })
})

describe('fitBoxToLayout', () => {
  const box: TextBox = { text: 'Hi', x: 1, y: 1, w: 2, h: 0.2, fontSize: 12 }
  const page = { width: 612, height: 792 } // 8.5×11 英寸

  it('同尺寸版式原样放置', () => {
    expect(fitBoxToLayout(box, page, { width: 8.5, height: 11 })).toEqual(box)
  })

  it('版式放大时等比缩放位置尺寸与字号', () => {
    expect(fitBoxToLayout(box, page, { width: 17, height: 22 })).toEqual({
      text: 'Hi',
      x: 2,
      y: 2,
      w: 4,
      h: 0.4,
      fontSize: 24,
    })
  })

  it('横纵缩放不一致时字号取较小者', () => {
    const fitted = fitBoxToLayout(box, page, { width: 17, height: 11 })
    expect(fitted.x).toBe(2)
    expect(fitted.y).toBe(1)
    expect(fitted.w).toBe(4)
    expect(fitted.fontSize).toBe(12)
  })

  it('页面尺寸非法时缩放退化为 1', () => {
    expect(fitBoxToLayout(box, { width: 0, height: 0 }, { width: 8.5, height: 11 })).toEqual(box)
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -converted 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-converted.pptx')
    expect(buildOutputFileName('my.report.final.PDF')).toBe('my.report.final-converted.pptx')
    expect(buildOutputFileName('archive')).toBe('archive-converted.pptx')
  })

  it('空名兜底为 document', () => {
    expect(buildOutputFileName('')).toBe('document-converted.pptx')
    expect(buildOutputFileName('.pdf')).toBe('document-converted.pptx')
  })
})
