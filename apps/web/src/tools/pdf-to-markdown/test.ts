import { describe, expect, it } from 'vitest'
import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  assertPagesHaveText,
  checkPdfPageCount,
  describePdfLoadError,
  groupItemsIntoLines,
  headingLevel,
  isPasswordError,
  lineToMarkdown,
  medianFontSize,
  pageToMarkdown,
  pdfToMarkdown,
  validatePdfFile,
} from './utils'
import type { PdfFileInfo, PdfLine, PdfTextItem } from './utils'
import type { PdfToMarkdownOptions } from './schema'

const pdfFile = (over: Partial<PdfFileInfo> = {}): PdfFileInfo => ({
  name: 'doc.pdf',
  size: 1024,
  type: 'application/pdf',
  ...over,
})

const item = (str: string, x: number, y: number, fontSize = 12): PdfTextItem => ({
  str,
  x,
  y,
  fontSize,
})

const line = (text: string, fontSize = 12, y = 700): PdfLine => ({ text, fontSize, y })

const opts = (over: Partial<PdfToMarkdownOptions> = {}): PdfToMarkdownOptions => ({
  detectHeadings: true,
  pageBreaks: true,
  ...over,
})

describe('pdf-to-markdown / 文件与页数校验', () => {
  it('空文件 / 超大 / 非 PDF 报错', () => {
    expect(() => validatePdfFile(pdfFile({ size: 0 }))).toThrow('文件为空')
    expect(() => validatePdfFile(pdfFile({ size: MAX_PDF_BYTES + 1 }))).toThrow('100 MiB')
    expect(() => validatePdfFile(pdfFile({ name: 'a.docx', type: '' }))).toThrow('请选择 PDF 文件')
  })

  it('页数 0/负/小数/NaN 视为损坏，51 页拒绝', () => {
    for (const n of [0, -1, 1.5, Number.NaN]) {
      expect(() => checkPdfPageCount(n)).toThrow('可能已损坏')
    }
    expect(() => checkPdfPageCount(1)).not.toThrow()
    expect(() => checkPdfPageCount(MAX_PDF_PAGES)).not.toThrow()
    expect(() => checkPdfPageCount(51)).toThrow('50 页上限')
  })

  it('加密 / 损坏 / 其他错误的中文文案', () => {
    expect(isPasswordError({ name: 'PasswordException' })).toBe(true)
    expect(isPasswordError(new Error('need password'))).toBe(true)
    expect(isPasswordError(new Error('x'))).toBe(false)
    // 非对象错误：跳过 name 判定走消息匹配
    expect(isPasswordError('need password')).toBe(true)
    expect(isPasswordError(42)).toBe(false)
    expect(isPasswordError(null)).toBe(false)
    expect(describePdfLoadError({ name: 'PasswordException' })).toContain('已加密')
    expect(describePdfLoadError(new Error('Invalid PDF'))).toContain('损坏')
    expect(describePdfLoadError(new Error('boom'))).toBe('PDF 加载失败：boom')
    expect(describePdfLoadError('oops')).toBe('PDF 加载失败：oops')
  })
})

describe('pdf-to-markdown / 行分组', () => {
  it('空输入返回空行集', () => {
    expect(groupItemsIntoLines([])).toEqual([])
  })

  it('空串项被过滤', () => {
    const lines = groupItemsIntoLines([item('', 0, 700), item('a', 10, 700)])
    expect(lines).toHaveLength(1)
    expect(lines[0]?.text).toBe('a')
  })

  it('y 相近归为一行，按 x 排序拼接', () => {
    const lines = groupItemsIntoLines([
      item('World', 100, 700),
      item('Hello ', 50, 701),
      item('第二行', 50, 680),
    ])
    expect(lines).toHaveLength(2)
    expect(lines[0]?.text).toBe('Hello World')
    expect(lines[1]?.text).toBe('第二行')
  })

  it('y 差超过容差则分行', () => {
    const lines = groupItemsIntoLines([item('a', 0, 700), item('b', 0, 690)])
    expect(lines.map((l) => l.text)).toEqual(['a', 'b'])
  })

  it('y 完全相同时按 x 排序（比较器等值分支）', () => {
    const lines = groupItemsIntoLines([item('b', 100, 700), item('a', 50, 700)])
    expect(lines).toHaveLength(1)
    expect(lines[0]?.text).toBe('ab')
  })

  it('行字号按字符数加权平均', () => {
    const lines = groupItemsIntoLines([item('ab', 0, 700, 10), item('cdef', 50, 700, 20)])
    expect(lines[0]?.fontSize).toBeCloseTo((10 * 2 + 20 * 4) / 6, 5)
  })
})

describe('pdf-to-markdown / 标题启发式', () => {
  it('中位数：空 / 奇 / 偶', () => {
    expect(medianFontSize([])).toBe(0)
    expect(medianFontSize([line('a', 10), line('b', 20), line('c', 30)])).toBe(20)
    expect(medianFontSize([line('a', 10), line('b', 30)])).toBe(20)
  })

  it('detectHeadings 关闭时一律 0', () => {
    expect(headingLevel(line('标题', 24), 12, false)).toBe(0)
  })

  it('median 或字号非法时返回 0', () => {
    expect(headingLevel(line('标题', 24), 0, true)).toBe(0)
    expect(headingLevel(line('标题', 0), 12, true)).toBe(0)
  })

  it('空行与超长行不是标题', () => {
    expect(headingLevel(line('   ', 24), 12, true)).toBe(0)
    expect(headingLevel(line('x'.repeat(61), 24), 12, true)).toBe(0)
  })

  it('字号比决定级别（含边界）', () => {
    expect(headingLevel(line('大', 18), 12, true)).toBe(1) // 1.5
    expect(headingLevel(line('大', 20), 12, true)).toBe(1)
    expect(headingLevel(line('中', 15), 12, true)).toBe(2) // 1.25
    expect(headingLevel(line('中', 16), 12, true)).toBe(2)
    expect(headingLevel(line('正', 13), 12, true)).toBe(0)
  })
})

describe('pdf-to-markdown / 行转 Markdown', () => {
  it('一/二级标题加 #', () => {
    expect(lineToMarkdown(line('报告', 20), 12, opts())).toBe('# 报告')
    expect(lineToMarkdown(line('小节', 15), 12, opts())).toBe('## 小节')
  })

  it('无序符号统一为 -，有序编号保留', () => {
    expect(lineToMarkdown(line('• 苹果', 12), 12, opts())).toBe('- 苹果')
    expect(lineToMarkdown(line('· 香蕉', 12), 12, opts())).toBe('- 香蕉')
    expect(lineToMarkdown(line('1. 第一步', 12), 12, opts())).toBe('1. 第一步')
    expect(lineToMarkdown(line('2) 第二步', 12), 12, opts())).toBe('2) 第二步')
  })

  it('非标题的行首 # / > 被转义', () => {
    expect(lineToMarkdown(line('# 话题', 12), 12, opts())).toBe('\\# 话题')
    expect(lineToMarkdown(line('> 引用', 12), 12, opts())).toBe('\\> 引用')
    // # 后无空格在 Markdown 里本就不是标题，无需转义
    expect(lineToMarkdown(line('#话题', 12), 12, opts())).toBe('#话题')
  })

  it('正文原样输出（去首尾空白）', () => {
    expect(lineToMarkdown(line('  普通段落  ', 12), 12, opts())).toBe('普通段落')
  })
})

describe('pdf-to-markdown / 页面与整篇', () => {
  it('空页给扫描页占位提示', () => {
    expect(pageToMarkdown([], 2, opts())).toContain('第 2 页无文本')
    expect(pageToMarkdown([], 2, opts())).toContain('#500')
  })

  it('段落间空一行，连续列表只换行', () => {
    const md = pageToMarkdown(
      [line('段一', 12), line('• a', 12), line('• b', 12), line('段二', 12)],
      1,
      opts(),
    )
    expect(md).toBe('段一\n\n- a\n- b\n\n段二')
  })

  it('全空则抛错并建议 #500 OCR', () => {
    expect(() => assertPagesHaveText([[], []])).toThrow('#500')
    expect(() => assertPagesHaveText([[{ text: '  ', fontSize: 12, y: 1 }]])).toThrow('#500')
    expect(() => assertPagesHaveText([[], [line('x', 12)]])).not.toThrow()
  })

  it('pdfToMarkdown 页间分隔线受选项控制', () => {
    const pages = [[line('第一页', 12)], [line('第二页', 12)]]
    expect(pdfToMarkdown(pages, opts())).toContain('\n\n---\n\n')
    expect(pdfToMarkdown(pages, opts({ pageBreaks: false }))).not.toContain('---')
  })

  it('pdfToMarkdown 全空直接抛错', () => {
    expect(() => pdfToMarkdown([[], []], opts())).toThrow('#500')
  })
})
