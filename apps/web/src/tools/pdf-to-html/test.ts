import { describe, expect, it } from 'vitest'
import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  assertPagesHaveText,
  checkPdfPageCount,
  describePdfLoadError,
  escapeHtml,
  groupItemsIntoLines,
  headingLevel,
  isPasswordError,
  lineToHtmlBlock,
  medianFontSize,
  pageToHtmlFragment,
  pdfToHtmlFragments,
  validatePdfFile,
  wrapHtmlDocument,
} from './utils'
import type { PdfFileInfo, PdfLine, PdfTextItem } from './utils'
import type { PdfToHtmlOptions } from './schema'

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

const opts = (over: Partial<PdfToHtmlOptions> = {}): PdfToHtmlOptions => ({
  detectHeadings: true,
  pageBreaks: true,
  ...over,
})

describe('pdf-to-html / 文件与页数校验', () => {
  it('空文件 / 超大 / 非 PDF 报错', () => {
    expect(() => validatePdfFile(pdfFile({ size: 0 }))).toThrow('文件为空')
    expect(() => validatePdfFile(pdfFile({ size: MAX_PDF_BYTES + 1 }))).toThrow('100 MiB')
    expect(() => validatePdfFile(pdfFile({ name: 'a.txt', type: 'text/plain' }))).toThrow(
      '请选择 PDF 文件',
    )
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

describe('pdf-to-html / 行分组与标题', () => {
  it('行分组：同行合并、异行分开、字号加权', () => {
    const lines = groupItemsIntoLines([
      item('World', 100, 700),
      item('Hello ', 50, 701),
      item('下', 50, 680),
    ])
    expect(lines.map((l) => l.text)).toEqual(['Hello World', '下'])
    expect(groupItemsIntoLines([])).toEqual([])
  })

  it('y 完全相同时按 x 排序（比较器等值分支）', () => {
    const lines = groupItemsIntoLines([item('b', 100, 700), item('a', 50, 700)])
    expect(lines).toHaveLength(1)
    expect(lines[0]?.text).toBe('ab')
  })

  it('中位数与标题级别', () => {
    expect(medianFontSize([])).toBe(0)
    expect(medianFontSize([line('a', 10), line('b', 20), line('c', 30)])).toBe(20)
    expect(medianFontSize([line('a', 10), line('b', 30)])).toBe(20)
    expect(headingLevel(line('大', 18), 12, true)).toBe(1)
    expect(headingLevel(line('中', 15), 12, true)).toBe(2)
    expect(headingLevel(line('正', 13), 12, true)).toBe(0)
    expect(headingLevel(line('大', 18), 12, false)).toBe(0)
    expect(headingLevel(line('大', 18), 0, true)).toBe(0)
    expect(headingLevel(line('大', 0), 12, true)).toBe(0)
    expect(headingLevel(line('  ', 18), 12, true)).toBe(0)
    expect(headingLevel(line('x'.repeat(61), 18), 12, true)).toBe(0)
  })
})

describe('pdf-to-html / 转义', () => {
  it('escapeHtml 转义 5 个特殊字符', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
    expect(escapeHtml('普通文字')).toBe('普通文字')
  })

  it('行内特殊字符被转义，不破坏结构', () => {
    const block = lineToHtmlBlock(line('a<b>&"c"', 12), 12, opts())
    expect(block.html).toBe('<p>a&lt;b&gt;&amp;&quot;c&quot;</p>')
  })
})

describe('pdf-to-html / 行转 HTML 块', () => {
  it('一/二级标题', () => {
    expect(lineToHtmlBlock(line('报告', 20), 12, opts())).toEqual({
      kind: 'heading1',
      html: '<h1>报告</h1>',
    })
    expect(lineToHtmlBlock(line('小节', 15), 12, opts())).toEqual({
      kind: 'heading2',
      html: '<h2>小节</h2>',
    })
  })

  it('关闭标题识别后大字号行退化为段落', () => {
    expect(lineToHtmlBlock(line('报告', 20), 12, opts({ detectHeadings: false }))).toEqual({
      kind: 'paragraph',
      html: '<p>报告</p>',
    })
  })

  it('无序列表项去符号进 li', () => {
    expect(lineToHtmlBlock(line('• 苹果', 12), 12, opts()).kind).toBe('listItem')
    expect(lineToHtmlBlock(line('- 香蕉', 12), 12, opts()).html).toBe('<li>香蕉</li>')
  })

  it('有序列表项去编号进 li', () => {
    const block = lineToHtmlBlock(line('1. 第一步', 12), 12, opts())
    expect(block.kind).toBe('orderedItem')
    expect(block.html).toBe('<li>第一步</li>')
  })

  it('普通段落', () => {
    expect(lineToHtmlBlock(line('正文', 12), 12, opts())).toEqual({
      kind: 'paragraph',
      html: '<p>正文</p>',
    })
  })
})

describe('pdf-to-html / 页面片段', () => {
  it('空页给占位提示', () => {
    const html = pageToHtmlFragment([], 2, opts())
    expect(html).toContain('第 2 页无文本')
    expect(html).toContain('#500')
    expect(html).toContain('data-page="2"')
  })

  it('连续无序列表包进一个 ul，有序进 ol，段落打断列表', () => {
    const html = pageToHtmlFragment(
      [line('• a', 12), line('• b', 12), line('段', 12), line('1. x', 12), line('2. y', 12)],
      1,
      opts(),
    )
    expect(html).toContain('<ul>\n<li>a</li>\n<li>b</li>\n</ul>')
    expect(html).toContain('<ol>\n<li>x</li>\n<li>y</li>\n</ol>')
    expect(html).toContain('<p>段</p>')
  })

  it('ul 与 ol 相邻时正确闭合与重开', () => {
    const html = pageToHtmlFragment([line('• a', 12), line('1. x', 12), line('• b', 12)], 1, opts())
    expect(html).toContain('</ul>\n<ol>')
    expect(html).toContain('</ol>\n<ul>')
  })

  it('末尾是列表时正确闭合', () => {
    const html = pageToHtmlFragment([line('段', 12), line('• a', 12)], 1, opts())
    expect(html.trimEnd().endsWith('</ul>\n</section>')).toBe(true)
  })
})

describe('pdf-to-html / 整篇与文档包装', () => {
  it('全空抛错并建议 #500', () => {
    expect(() => assertPagesHaveText([[], []])).toThrow('#500')
    expect(() => assertPagesHaveText([[line('x', 12)]])).not.toThrow()
    expect(() => pdfToHtmlFragments([[], []], opts())).toThrow('#500')
  })

  it('页间分隔线受选项控制', () => {
    const pages = [[line('一', 12)], [line('二', 12)]]
    expect(pdfToHtmlFragments(pages, opts())).toContain('<hr class="pdf-page-break">')
    expect(pdfToHtmlFragments(pages, opts({ pageBreaks: false }))).not.toContain('<hr')
  })

  it('wrapHtmlDocument 包出独立文档并转义标题', () => {
    const doc = wrapHtmlDocument('<p>x</p>', 'a<b>.pdf')
    expect(doc).toContain('<!DOCTYPE html>')
    expect(doc).toContain('<title>a&lt;b&gt;.pdf</title>')
    expect(doc).toContain('<meta charset="utf-8">')
    expect(doc).toContain('<p>x</p>')
  })
})
