import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { InvoiceInput } from './schema'
import {
  CJK_ERROR,
  assertLatin1,
  buildInvoiceData,
  buildInvoiceLines,
  buildPdf,
  formatMoney,
  parseItems,
  parseTaxRate,
  renderDocLines,
  round2,
  toPlainText,
  wrapLine,
} from './utils'
import type { DocLine, InvoiceData } from './utils'

const BASE_INPUT: InvoiceInput = {
  text: 'Website design,1,8000\nDomain renewal,2,100',
  seller: 'Acme Studio',
  buyer: 'Globex Ltd',
  number: 'INV-2026-0001',
  date: '2026-09-28',
  taxRate: '6',
  notes: 'Pay within 15 days',
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

describe('invoice-pdf / 基础函数', () => {
  it('round2 修掉浮点误差', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(10.005)).toBe(10.01)
  })

  it('formatMoney 保留两位小数', () => {
    expect(formatMoney(123)).toBe('123.00')
    expect(formatMoney(1.5)).toBe('1.50')
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

describe('invoice-pdf / 明细解析', () => {
  it('合法明细解析正确', () => {
    const items = parseItems('Website design,1,8000\nDomain renewal,2,100')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      name: 'Website design',
      quantity: 1,
      price: 8000,
      amount: 8000,
    })
    expect(items[1]).toMatchObject({ quantity: 2, price: 100, amount: 200 })
  })

  it('空行被跳过', () => {
    expect(parseItems('\nWebsite design,1,8000\n\n')).toHaveLength(1)
  })

  it('列数不对时报错并带行号', () => {
    expect(() => parseItems('a,1')).toThrow('第 1 行格式错误')
    expect(() => parseItems('ok,1,2\nbad,line')).toThrow('第 2 行格式错误')
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

  it('单价可为 0', () => {
    expect(parseItems('gift,1,0')[0]?.amount).toBe(0)
  })

  it('全空明细报错', () => {
    expect(() => parseItems('\n  \n')).toThrow('请至少填写一行明细')
  })
})

describe('invoice-pdf / 税率与数据组装', () => {
  it('税率空表示 0', () => {
    expect(parseTaxRate('')).toBe(0)
    expect(parseTaxRate('   ')).toBe(0)
  })

  it('税率正常解析', () => {
    expect(parseTaxRate('6')).toBe(6)
    expect(parseTaxRate(' 13.5 ')).toBe(13.5)
  })

  it('税率非法报错', () => {
    expect(() => parseTaxRate('abc')).toThrow('税率必须是大于等于 0 的数字')
    expect(() => parseTaxRate('-1')).toThrow('税率必须是大于等于 0 的数字')
  })

  it('合计计算正确', () => {
    const data = buildInvoiceData(BASE_INPUT)
    expect(data.subtotal).toBe(8200)
    expect(data.tax).toBe(492)
    expect(data.total).toBe(8692)
    expect(data.taxRate).toBe(6)
  })

  it('空明细报错', () => {
    expect(() => buildInvoiceData({ ...BASE_INPUT, text: '  ' })).toThrow('请填写发票明细')
  })

  it('字段含中文报错', () => {
    expect(() => buildInvoiceData({ ...BASE_INPUT, seller: '中文公司' })).toThrow(CJK_ERROR)
  })

  it('可选字段可空', () => {
    const data = buildInvoiceData({
      ...BASE_INPUT,
      seller: '',
      buyer: '',
      number: '',
      date: '',
      taxRate: '',
      notes: '',
    })
    expect(data.tax).toBe(0)
    expect(data.total).toBe(8200)
  })
})

describe('invoice-pdf / 版式', () => {
  function data(): InvoiceData {
    return buildInvoiceData(BASE_INPUT)
  }

  it('完整字段版式', () => {
    const lines = buildInvoiceLines(data())
    expect(lines[0]).toMatchObject({ text: 'INVOICE', align: 'center', bold: true })
    expect(lines.some((l) => l.text.includes('INV-2026-0001'))).toBe(true)
    expect(lines.some((l) => l.text === 'From: Acme Studio')).toBe(true)
    expect(lines.some((l) => l.text === 'To: Globex Ltd')).toBe(true)
    expect(lines.some((l) => l.text.startsWith('Total: 8692.00'))).toBe(true)
    expect(lines.some((l) => l.text.startsWith('Notes:'))).toBe(true)
  })

  it('可选字段缺失时对应行省略', () => {
    const lines = buildInvoiceLines(
      buildInvoiceData({ ...BASE_INPUT, seller: '', buyer: '', number: '', date: '', notes: '' }),
    )
    expect(lines.some((l) => l.text.startsWith('From:'))).toBe(false)
    expect(lines.some((l) => l.text.startsWith('To:'))).toBe(false)
    expect(lines.some((l) => l.text.startsWith('Notes:'))).toBe(false)
    // 只有标题一行居中
    expect(lines.filter((l) => l.align === 'center').map((l) => l.text)).toEqual(['INVOICE'])
  })

  it('超长品名截断加 ...', () => {
    const longName = 'a'.repeat(40)
    const lines = buildInvoiceLines(buildInvoiceData({ ...BASE_INPUT, text: `${longName},1,10` }))
    const row = lines.find((l) => l.text.includes('a'.repeat(27)))
    expect(row?.text.startsWith('a'.repeat(27) + '...')).toBe(true)
  })

  it('纯文本版包含关键行', () => {
    const text = toPlainText(data())
    expect(text).toContain('INVOICE')
    expect(text).toContain('Total: 8692.00')
    expect(text).toContain('No: INV-2026-0001')
  })

  it('纯文本版可选字段缺失时省略', () => {
    const text = toPlainText(
      buildInvoiceData({ ...BASE_INPUT, seller: '', buyer: '', number: '', date: '', notes: '' }),
    )
    expect(text).not.toContain('No:')
    expect(text).not.toContain('From:')
    expect(text).not.toContain('Notes:')
  })
})

describe('invoice-pdf / 渲染', () => {
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

describe('invoice-pdf / buildPdf', () => {
  it('合法输入生成 PDF', async () => {
    const result = await buildPdf(BASE_INPUT)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('空明细 / 中文分别报错', async () => {
    await expect(buildPdf({ ...BASE_INPUT, text: '' })).rejects.toThrow('请填写发票明细')
    await expect(buildPdf({ ...BASE_INPUT, text: '中文品名,1,10' })).rejects.toThrow(CJK_ERROR)
  })
})
