import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { CodeToPdfOptions } from './schema'
import {
  CJK_ERROR,
  MAX_INPUT_CHARS,
  TAB_WIDTH,
  assertLatin1,
  buildPdf,
  checkTextInput,
  codeToDocLines,
  renderDocLines,
  wrapLine,
} from './utils'
import type { DocLine } from './utils'

const options: CodeToPdfOptions = { fontSize: '10', lineNumbers: true, margin: '54' }

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

describe('code-to-pdf / 输入校验与换行', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('空 / 超长输入报错', () => {
    expect(() => checkTextInput('', '代码')).toThrow('请输入代码')
    expect(() => checkTextInput('x'.repeat(MAX_INPUT_CHARS + 1), '代码')).toThrow(
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

describe('code-to-pdf / 解析', () => {
  it('行号开关打开时前缀序号', () => {
    const lines = codeToDocLines('a\nb', 10, true)
    expect(lines.map((l) => l.text)).toEqual(['1 | a', '2 | b'])
    expect(lines.every((l) => l.mono)).toBe(true)
  })

  it('行号开关关闭时无前缀', () => {
    const lines = codeToDocLines('a\nb', 10, false)
    expect(lines.map((l) => l.text)).toEqual(['a', 'b'])
  })

  it('序号宽度按总行数右对齐', () => {
    const lines = codeToDocLines(Array.from({ length: 12 }, (_, i) => `l${i}`).join('\n'), 10, true)
    expect(lines[0]?.text).toBe(' 1 | l0')
    expect(lines[11]?.text).toBe('12 | l11')
  })

  it('制表符展开为 4 空格', () => {
    expect(TAB_WIDTH).toBe(4)
    const lines = codeToDocLines('\ta', 10, false)
    expect(lines[0]?.text).toBe('    a')
  })

  it('字号透传', () => {
    expect(codeToDocLines('a', 9, false)[0]?.size).toBe(9)
  })
})

describe('code-to-pdf / 渲染', () => {
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

describe('code-to-pdf / buildPdf', () => {
  it('合法输入生成 PDF', async () => {
    const result = await buildPdf({ text: 'const a = 1;\nconsole.log(a);' }, options)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('行号开关透传', async () => {
    const result = await buildPdf({ text: 'a' }, { ...options, lineNumbers: false })
    expect(result.pages).toBe(1)
  })

  it('空输入 / 超长 / 中文分别报错', async () => {
    await expect(buildPdf({ text: '' }, options)).rejects.toThrow('请输入代码')
    await expect(buildPdf({ text: 'x'.repeat(MAX_INPUT_CHARS + 1) }, options)).rejects.toThrow(
      '超过 100,000 字符上限',
    )
    await expect(buildPdf({ text: '// 中文注释' }, options)).rejects.toThrow(CJK_ERROR)
  })
})
