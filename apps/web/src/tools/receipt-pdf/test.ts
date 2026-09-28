import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { ReceiptInput } from './schema'
import {
  CJK_ERROR,
  assertLatin1,
  buildPdf,
  buildReceiptData,
  buildReceiptLines,
  formatMoney,
  parseItems,
  renderDocLines,
  round2,
  toPlainText,
  wrapLine,
} from './utils'
import type { DocLine, ReceiptData } from './utils'

const BASE_INPUT: ReceiptInput = {
  text: 'Coffee,2,4.5\nSandwich,1,12',
  merchant: 'Sunny Cafe',
  date: '2026-09-28',
  payment: 'Credit Card',
}

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

describe('receipt-pdf / 基础函数', () => {
  it('round2 修掉浮点误差', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })

  it('formatMoney 保留两位小数', () => {
    expect(formatMoney(21)).toBe('21.00')
  })

  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('wrapLine 基本行为', async () => {
    const font = await helvFont()
    expect(wrapLine('', font, 12, 400)).toEqual([''])
    expect(wrapLine('a b', font, 12, 400)).toEqual(['a b'])
    expect(wrapLine('a b', font, 12, 5)).toEqual(['a', 'b'])
  })
})

describe('receipt-pdf / 明细解析', () => {
  it('合法明细解析正确', () => {
    const items = parseItems('Coffee,2,4.5')
    expect(items[0]).toMatchObject({ name: 'Coffee', quantity: 2, price: 4.5, amount: 9 })
  })

  it('空行被跳过', () => {
    expect(parseItems('\nCoffee,2,4.5\n\n')).toHaveLength(1)
  })

  it('列数不对时报错并带行号', () => {
    expect(() => parseItems('a,1')).toThrow('第 1 行格式错误')
  })

  it('品名为空报错', () => {
    expect(() => parseItems(',1,2')).toThrow('第 1 行品名不能为空')
  })

  it('数量非法报错', () => {
    expect(() => parseItems('a,x,2')).toThrow('第 1 行数量必须是大于 0 的数字')
    expect(() => parseItems('a,0,2')).toThrow('第 1 行数量必须是大于 0 的数字')
    expect(() => parseItems('a,-1,2')).toThrow('第 1 行数量必须是大于 0 的数字')
  })

  it('单价非法报错', () => {
    expect(() => parseItems('a,1,x')).toThrow('第 1 行单价必须是不小于 0 的数字')
    expect(() => parseItems('a,1,-5')).toThrow('第 1 行单价必须是不小于 0 的数字')
  })

  it('全空明细报错', () => {
    expect(() => parseItems('  \n')).toThrow('请至少填写一行明细')
  })
})

describe('receipt-pdf / 数据组装', () => {
  it('总计计算正确', () => {
    const data = buildReceiptData(BASE_INPUT)
    expect(data.total).toBe(21)
  })

  it('空明细报错', () => {
    expect(() => buildReceiptData({ ...BASE_INPUT, text: '  ' })).toThrow('请填写收据明细')
  })

  it('字段含中文报错', () => {
    expect(() => buildReceiptData({ ...BASE_INPUT, merchant: '咖啡馆' })).toThrow(CJK_ERROR)
  })

  it('可选字段可空', () => {
    const data = buildReceiptData({ ...BASE_INPUT, merchant: '', date: '', payment: '' })
    expect(data.total).toBe(21)
  })
})

describe('receipt-pdf / 版式', () => {
  function data(): ReceiptData {
    return buildReceiptData(BASE_INPUT)
  }

  it('完整字段版式', () => {
    const lines = buildReceiptLines(data())
    expect(lines[0]).toMatchObject({ text: 'RECEIPT', align: 'center', bold: true })
    expect(lines[1]).toMatchObject({ text: 'Sunny Cafe', align: 'center' })
    expect(lines.some((l) => l.text.includes('2026-09-28'))).toBe(true)
    expect(lines.some((l) => l.text.startsWith('Total: 21.00'))).toBe(true)
    expect(lines.some((l) => l.text === 'Thank you!')).toBe(true)
  })

  it('可选字段缺失时对应行省略', () => {
    const lines = buildReceiptLines(
      buildReceiptData({ ...BASE_INPUT, merchant: '', date: '', payment: '' }),
    )
    expect(lines[0]?.text).toBe('RECEIPT')
    expect(lines[1]?.rule).toBe(true) // 商户与元信息行都省略后直接是分割线
    expect(lines.some((l) => l.text.includes('|'))).toBe(false)
  })

  it('超长品名截断加 ...', () => {
    const longName = 'b'.repeat(40)
    const lines = buildReceiptLines(buildReceiptData({ ...BASE_INPUT, text: `${longName},1,10` }))
    const row = lines.find((l) => l.text.includes('b'.repeat(31)))
    expect(row?.text.startsWith('b'.repeat(31) + '...')).toBe(true)
  })

  it('纯文本版包含关键行', () => {
    const text = toPlainText(data())
    expect(text).toContain('RECEIPT')
    expect(text).toContain('Total: 21.00')
    expect(text).toContain('Sunny Cafe')
  })

  it('纯文本版可选字段缺失时省略', () => {
    const text = toPlainText(
      buildReceiptData({ ...BASE_INPUT, merchant: '', date: '', payment: '' }),
    )
    expect(text).not.toContain('Sunny Cafe')
    expect(text).not.toContain('Date:')
    expect(text).not.toContain('Payment:')
  })
})

describe('receipt-pdf / 渲染', () => {
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

describe('receipt-pdf / buildPdf', () => {
  it('合法输入生成 PDF', async () => {
    const result = await buildPdf(BASE_INPUT)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('空明细 / 中文分别报错', async () => {
    await expect(buildPdf({ ...BASE_INPUT, text: '' })).rejects.toThrow('请填写收据明细')
    await expect(buildPdf({ ...BASE_INPUT, text: '咖啡,1,10' })).rejects.toThrow(CJK_ERROR)
  })
})
