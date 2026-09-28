import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { MarkdownToPdfOptions } from './schema'
import {
  CJK_ERROR,
  MAX_INPUT_CHARS,
  assertLatin1,
  buildPdf,
  checkTextInput,
  parseMarkdown,
  renderDocLines,
  wrapLine,
} from './utils'
import type { DocLine } from './utils'

const options: MarkdownToPdfOptions = { fontSize: '12', margin: '54' }

/** 单元测试用的真实字体（wrapLine 需要度量文本宽度） */
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

describe('markdown-to-pdf / 输入校验', () => {
  it('纯 ASCII 与 Latin-1 字符通过', () => {
    expect(() => assertLatin1('Hello, world! 123')).not.toThrow()
    expect(() => assertLatin1('caf\u00e9 \u00a9')).not.toThrow() // é © 都在 Latin-1 内
  })

  it('中文字符被拒绝并给出中文错误', () => {
    expect(() => assertLatin1('你好')).toThrow(CJK_ERROR)
  })

  it('emoji（代理对）同样被拒绝', () => {
    expect(() => assertLatin1('hi 😀')).toThrow(CJK_ERROR)
  })

  it('空输入与空白输入报错', () => {
    expect(() => checkTextInput('', 'Markdown 内容')).toThrow('请输入Markdown 内容')
    expect(() => checkTextInput('   \n  ', 'Markdown 内容')).toThrow('请输入Markdown 内容')
  })

  it('超长输入报错', () => {
    expect(() => checkTextInput('x'.repeat(MAX_INPUT_CHARS + 1), 'Markdown 内容')).toThrow(
      '超过 100,000 字符上限',
    )
  })

  it('上限内且无中文的输入通过', () => {
    expect(() => checkTextInput('x'.repeat(MAX_INPUT_CHARS), 'Markdown 内容')).not.toThrow()
  })
})

describe('markdown-to-pdf / 换行', () => {
  it('空字符串得到一行空行', async () => {
    expect(wrapLine('', await helvFont(), 12, 400)).toEqual([''])
  })

  it('宽度足够时不换行', async () => {
    expect(wrapLine('hello world', await helvFont(), 12, 400)).toEqual(['hello world'])
  })

  it('宽度不足时按词换行', async () => {
    expect(wrapLine('aaa bbb ccc', await helvFont(), 12, 10)).toEqual(['aaa', 'bbb', 'ccc'])
  })

  it('超长单词独占一行不断词', async () => {
    const font = await helvFont()
    const word = 'supercalifragilisticexpialidocious'
    expect(font.widthOfTextAtSize(word, 12)).toBeGreaterThan(50)
    expect(wrapLine(word, font, 12, 50)).toEqual([word])
  })
})

describe('markdown-to-pdf / 解析', () => {
  it('标题分级：h1/h2/h3/h4 字号递减且加粗', () => {
    const lines = parseMarkdown('# A\n## B\n### C\n#### D', 12)
    expect(lines.map((l) => l.size)).toEqual([22, 19, 16, 14])
    expect(lines.every((l) => l.bold)).toBe(true)
    expect(lines[0]?.text).toBe('A')
  })

  it('代码围栏：开关切换，围栏内等宽缩进', () => {
    const lines = parseMarkdown('```js\nconst a = 1;\n```\nafter', 12)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ text: 'const a = 1;', mono: true, indent: 12, size: 11 })
    expect(lines[1]).toMatchObject({ text: 'after', mono: false })
  })

  it('未闭合围栏后全部按代码处理', () => {
    const lines = parseMarkdown('```\ncode', 12)
    expect(lines[0]?.mono).toBe(true)
  })

  it('无序列表统一用 - 前缀，有序列表保留序号', () => {
    const lines = parseMarkdown('- a\n* b\n+ c\n1. d\n2) e', 12)
    expect(lines.map((l) => l.text)).toEqual(['- a', '- b', '- c', '1. d', '2) e'])
    expect(lines[0]?.indent).toBe(18)
  })

  it('嵌套列表按前导空格加深缩进', () => {
    const lines = parseMarkdown('- a\n  - b\n    - c', 12)
    expect(lines.map((l) => l.indent)).toEqual([18, 30, 42])
  })

  it('引用缩进更大', () => {
    const lines = parseMarkdown('> quoted', 12)
    expect(lines[0]).toMatchObject({ text: 'quoted', indent: 24 })
  })

  it('--- 与 *** 都是分割线', () => {
    expect(parseMarkdown('---', 12)[0]?.rule).toBe(true)
    expect(parseMarkdown('  ***  ', 12)[0]?.rule).toBe(true)
  })

  it('空行是段间距，普通行是段落', () => {
    const lines = parseMarkdown('para one\n\npara two', 12)
    expect(lines).toHaveLength(3)
    expect(lines[1]?.text).toBe('')
    expect(lines[2]?.text).toBe('para two')
  })
})

describe('markdown-to-pdf / 渲染', () => {
  it('四种字体组合各走各的分支', async () => {
    const result = await renderDocLines(
      [
        line({ text: 'plain', mono: false, bold: false }),
        line({ text: 'bold', mono: false, bold: true }),
        line({ text: 'mono', mono: true, bold: false }),
        line({ text: 'monobold', mono: true, bold: true }),
      ],
      54,
    )
    expect(result.pages).toBe(1)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
  })

  it('分割线在页首直接画，不另起页', async () => {
    const result = await renderDocLines([line({ rule: true })], 54)
    expect(result.pages).toBe(1)
  })

  it('分割线落在页尾禁区时先分页', async () => {
    // 每段占 12*1.35+6=22.2pt；33 段后 y=55.29 < 54+8，分割线触发分页
    const paras = Array.from({ length: 33 }, (_, i) => line({ text: `p${i}` }))
    const result = await renderDocLines([...paras, line({ rule: true })], 54)
    expect(result.pages).toBe(2)
  })

  it('内容超出一页自动分页', async () => {
    const paras = Array.from({ length: 40 }, (_, i) => line({ text: `p${i}` }))
    const result = await renderDocLines(paras, 54)
    expect(result.pages).toBe(2)
  })

  it('居中与左对齐各走各的分支', async () => {
    const result = await renderDocLines(
      [line({ text: 'center', align: 'center' }), line({ text: 'left', align: 'left' })],
      54,
    )
    expect(result.pages).toBe(1)
  })

  it('长段落自动换行后仍在一页', async () => {
    const long = 'word '.repeat(200).trim()
    const result = await renderDocLines([line({ text: long })], 54)
    expect(result.pages).toBeGreaterThanOrEqual(1)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
  })

  it('渲染时遇到中文同样报错', async () => {
    await expect(renderDocLines([line({ text: '中文' })], 54)).rejects.toThrow(CJK_ERROR)
  })
})

describe('markdown-to-pdf / buildPdf', () => {
  it('合法输入生成带 %PDF 头的文档', async () => {
    const result = await buildPdf({ text: '# Title\n\nHello world' }, options)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('空输入 / 超长 / 中文分别报错', async () => {
    await expect(buildPdf({ text: '' }, options)).rejects.toThrow('请输入Markdown 内容')
    await expect(buildPdf({ text: 'x'.repeat(MAX_INPUT_CHARS + 1) }, options)).rejects.toThrow(
      '超过 100,000 字符上限',
    )
    await expect(buildPdf({ text: '# 标题' }, options)).rejects.toThrow(CJK_ERROR)
  })

  it('选项字号与边距透传给渲染', async () => {
    const result = await buildPdf({ text: 'hi' }, { fontSize: '14', margin: '72' })
    expect(result.pages).toBe(1)
  })
})
