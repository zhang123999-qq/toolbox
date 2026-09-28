import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { JsonToPdfOptions } from './schema'
import {
  CJK_ERROR,
  MAX_INPUT_CHARS,
  assertLatin1,
  buildPdf,
  checkTextInput,
  jsonToDocLines,
  parseJson,
  renderDocLines,
  wrapLine,
} from './utils'
import type { DocLine } from './utils'

const options: JsonToPdfOptions = { fontSize: '10', margin: '54' }

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

describe('json-to-pdf / 输入校验与换行', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('空 / 超长输入报错', () => {
    expect(() => checkTextInput('', 'JSON 内容')).toThrow('请输入JSON 内容')
    expect(() => checkTextInput('x'.repeat(MAX_INPUT_CHARS + 1), 'JSON 内容')).toThrow(
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

describe('json-to-pdf / 解析', () => {
  it('合法 JSON 解析通过', () => {
    expect(parseJson('{"a":1,"b":[true,null]}')).toEqual({ a: 1, b: [true, null] })
  })

  it('非法 JSON 给出中文错误', () => {
    expect(() => parseJson('{a:1}')).toThrow('JSON 解析失败')
    expect(() => parseJson('{"a":}')).toThrow('JSON 解析失败')
    expect(() => parseJson('')).toThrow('JSON 解析失败')
  })

  it('格式化打印为 2 空格缩进的等宽行', () => {
    const lines = jsonToDocLines({ a: 1, b: [1, 2] }, 10)
    expect(lines.map((l) => l.text)).toEqual([
      '{',
      '  "a": 1,',
      '  "b": [',
      '    1,',
      '    2',
      '  ]',
      '}',
    ])
    expect(lines.every((l) => l.mono && l.size === 10)).toBe(true)
  })

  it('标量 JSON 也能打印', () => {
    expect(jsonToDocLines(42, 10).map((l) => l.text)).toEqual(['42'])
    expect(jsonToDocLines('str', 10).map((l) => l.text)).toEqual(['"str"'])
  })
})

describe('json-to-pdf / 渲染', () => {
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

describe('json-to-pdf / buildPdf', () => {
  it('合法输入生成 PDF', async () => {
    const result = await buildPdf({ text: '{"name":"toolbox","n":3}' }, options)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('空输入 / 超长 / 中文值 / 非法 JSON 分别报错', async () => {
    await expect(buildPdf({ text: '' }, options)).rejects.toThrow('请输入JSON 内容')
    await expect(buildPdf({ text: 'x'.repeat(MAX_INPUT_CHARS + 1) }, options)).rejects.toThrow(
      '超过 100,000 字符上限',
    )
    // JSON 合法但含中文字符串：输入校验阶段即报 CJK 错误
    await expect(buildPdf({ text: '{"a":"中文"}' }, options)).rejects.toThrow(CJK_ERROR)
    await expect(buildPdf({ text: '{bad}' }, options)).rejects.toThrow('JSON 解析失败')
  })
})
