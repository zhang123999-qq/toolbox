import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { HtmlToPdfOptions } from './schema'
import {
  CJK_ERROR,
  MAX_INPUT_CHARS,
  assertLatin1,
  buildPdf,
  checkTextInput,
  decodeEntities,
  htmlToMarkdownLite,
  parseMarkdown,
  renderDocLines,
  wrapLine,
} from './utils'
import type { DocLine } from './utils'

const options: HtmlToPdfOptions = { fontSize: '12', margin: '54' }

async function helvFont(): Promise<PDFFont> {
  const doc = await PDFDocument.create()
  return doc.embedFont(StandardFonts.Helvetica)
}

function line(partial: Partial<DocLine>): DocLine {
  return {
    text: 'x',
    size: 12,
    bold: false,
    mono: false,
    indent: 0,
    spaceAfter: 6,
    rule: false,
    align: 'left',
    ...partial,
  }
}

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 4))
}

describe('html-to-pdf / 实体解码', () => {
  it('命名实体', () => {
    expect(decodeEntities('&amp;&lt;&gt;&quot;&#39;&nbsp;')).toBe('&<>"\' ')
  })

  it('十进制与十六进制数字实体', () => {
    expect(decodeEntities('&#65;')).toBe('A')
    expect(decodeEntities('&#x41;')).toBe('A')
    expect(decodeEntities('&#X41;')).toBe('A')
  })

  it('未知命名实体原样保留', () => {
    expect(decodeEntities('&nosuch;')).toBe('&nosuch;')
  })

  it('超出 Unicode 范围的码点原样保留', () => {
    expect(decodeEntities('&#x110000;')).toBe('&#x110000;')
  })
})

describe('html-to-pdf / 结构提取', () => {
  it('标题转 Markdown-lite 标记', () => {
    const lite = htmlToMarkdownLite('<h1>Title</h1><h3>Sub</h3>')
    expect(lite).toContain('# Title')
    expect(lite).toContain('### Sub')
  })

  it('script 与 style 整块丢弃', () => {
    const lite = htmlToMarkdownLite('<script>alert(1)</script><style>.a{}</style><p>keep</p>')
    expect(lite).not.toContain('alert')
    expect(lite).not.toContain('.a{}')
    expect(lite).toContain('keep')
  })

  it('段落 / 换行 / 列表 / 分割线 / 引用 / 代码块', () => {
    const lite = htmlToMarkdownLite(
      '<p>para</p><br><ul><li>a</li><li>b</li></ul><hr><blockquote>q</blockquote><pre>code</pre>',
    )
    expect(lite).toContain('para')
    expect(lite).toContain('- a')
    expect(lite).toContain('- b')
    expect(lite).toContain('---')
    expect(lite).toContain('> q')
    expect(lite).toContain('```')
    expect(lite).toContain('code')
  })

  it('其余标签剥除、实体解码', () => {
    expect(htmlToMarkdownLite('<div class="x"><b>a &amp; b</b></div>')).toContain('a & b')
  })
})

describe('html-to-pdf / 输入校验与换行', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('空 / 超长输入报错', () => {
    expect(() => checkTextInput('', 'HTML 内容')).toThrow('请输入HTML 内容')
    expect(() => checkTextInput('x'.repeat(MAX_INPUT_CHARS + 1), 'HTML 内容')).toThrow(
      '超过 100,000 字符上限',
    )
  })

  it('wrapLine 基本行为', async () => {
    const font = await helvFont()
    expect(wrapLine('', font, 12, 400)).toEqual([''])
    expect(wrapLine('a b', font, 12, 400)).toEqual(['a b'])
    expect(wrapLine('a b', font, 12, 5)).toEqual(['a', 'b'])
  })
})

describe('html-to-pdf / 解析与渲染', () => {
  it('标题分级与回退分支', () => {
    const lines = parseMarkdown('# A\n## B\n### C\n#### D', 12)
    expect(lines.map((l) => l.size)).toEqual([22, 19, 16, 14])
  })

  it('代码块 / 列表 / 引用 / 分割线 / 空行 / 段落', () => {
    const lines = parseMarkdown('```\ncode\n```\n- a\n1. b\n> q\n---\n\npara', 12)
    expect(lines[0]).toMatchObject({ mono: true, text: 'code' })
    expect(lines[1]?.text).toBe('- a')
    expect(lines[2]?.text).toBe('1. b')
    expect(lines[3]).toMatchObject({ indent: 24 })
    expect(lines[4]?.rule).toBe(true)
    expect(lines[5]?.text).toBe('')
    expect(lines[6]?.text).toBe('para')
  })

  it('四种字体组合', async () => {
    const result = await renderDocLines(
      [
        line({ mono: false, bold: false }),
        line({ mono: false, bold: true }),
        line({ mono: true, bold: false }),
        line({ mono: true, bold: true }),
      ],
      54,
    )
    expect(result.pages).toBe(1)
  })

  it('分割线页首不分页、页尾分页', async () => {
    expect((await renderDocLines([line({ rule: true })], 54)).pages).toBe(1)
    const paras = Array.from({ length: 33 }, (_, i) => line({ text: `p${i}` }))
    expect((await renderDocLines([...paras, line({ rule: true })], 54)).pages).toBe(2)
  })

  it('超长内容自动分页', async () => {
    const paras = Array.from({ length: 40 }, (_, i) => line({ text: `p${i}` }))
    expect((await renderDocLines(paras, 54)).pages).toBe(2)
  })

  it('居中与左对齐', async () => {
    const result = await renderDocLines([line({ align: 'center' }), line({ align: 'left' })], 54)
    expect(result.pages).toBe(1)
  })

  it('渲染时中文报错', async () => {
    await expect(renderDocLines([line({ text: '中文' })], 54)).rejects.toThrow(CJK_ERROR)
  })
})

describe('html-to-pdf / buildPdf', () => {
  it('合法 HTML 生成 PDF', async () => {
    const result = await buildPdf(
      { text: '<h1>Title</h1><p>Hello <b>world</b></p><ul><li>a</li></ul>' },
      options,
    )
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('空输入 / 超长 / 中文 / 无文本分别报错', async () => {
    await expect(buildPdf({ text: '' }, options)).rejects.toThrow('请输入HTML 内容')
    await expect(buildPdf({ text: 'x'.repeat(MAX_INPUT_CHARS + 1) }, options)).rejects.toThrow(
      '超过 100,000 字符上限',
    )
    await expect(buildPdf({ text: '<p>中文</p>' }, options)).rejects.toThrow(CJK_ERROR)
    await expect(buildPdf({ text: '<div><br></div>' }, options)).rejects.toThrow(
      'HTML 中未提取到任何文本内容',
    )
  })
})
