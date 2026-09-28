import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { TextToPdfOptions } from './schema'
import {
  CJK_ERROR,
  MAX_INPUT_CHARS,
  assertLatin1,
  buildPdf,
  checkTextInput,
  renderDocLines,
  textToDocLines,
  wrapLine,
} from './utils'
import type { DocLine } from './utils'

const options: TextToPdfOptions = { fontSize: '12', margin: '54' }

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

describe('text-to-pdf / 输入校验与换行', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('空 / 超长输入报错', () => {
    expect(() => checkTextInput('', '文本内容')).toThrow('请输入文本内容')
    expect(() => checkTextInput('x'.repeat(MAX_INPUT_CHARS + 1), '文本内容')).toThrow(
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

describe('text-to-pdf / 解析', () => {
  it('空行转段间距，文本行原样保留', () => {
    const lines = textToDocLines('hello\n\n  world  ', 12)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatchObject({ text: 'hello', spaceAfter: 2 })
    expect(lines[1]).toMatchObject({ text: '', spaceAfter: 12 * 0.6 })
    // 文本行保留原始前导空格（纯文本工具不做 trim）
    expect(lines[2]?.text).toBe('  world  ')
  })

  it('字号透传', () => {
    expect(textToDocLines('a', 14)[0]?.size).toBe(14)
  })
})

describe('text-to-pdf / 渲染', () => {
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

describe('text-to-pdf / buildPdf', () => {
  it('合法输入生成 PDF', async () => {
    const result = await buildPdf({ text: 'Hello\n\nWorld' }, options)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('空输入 / 超长 / 中文分别报错', async () => {
    await expect(buildPdf({ text: '' }, options)).rejects.toThrow('请输入文本内容')
    await expect(buildPdf({ text: 'x'.repeat(MAX_INPUT_CHARS + 1) }, options)).rejects.toThrow(
      '超过 100,000 字符上限',
    )
    await expect(buildPdf({ text: '中文' }, options)).rejects.toThrow(CJK_ERROR)
  })
})
