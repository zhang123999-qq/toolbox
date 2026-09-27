import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  InvoiceError,
  buildInvoiceData,
  exportFileName,
  formatInvoiceText,
  formatMoney,
  localizeError,
  parseInvoiceDate,
  parseItems,
  parseTaxRate,
  roundMoney,
  toPlainText,
} from './utils'
import type { InvoiceInput } from './schema'

const zh = createTranslator('zh')
const en = createTranslator('en')

/** 断言抛出指定 key 的 InvoiceError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(InvoiceError)
    expect((error as InvoiceError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

const base: InvoiceInput = {
  text: '网站设计服务,1,8000\n域名续费,2,100\n服务器托管（年）,1,2400',
  seller: '星辰科技有限公司',
  buyer: '蓝海互联有限公司',
  number: 'INV-2026-0001',
  date: '2026-09-27',
  taxRate: '6',
  notes: '请于 15 日内付款',
}

const emptyInput: InvoiceInput = {
  text: '',
  seller: '',
  buyer: '',
  number: '',
  date: '',
  taxRate: '',
  notes: '',
}

describe('invoice-gen / roundMoney & formatMoney', () => {
  it('浮点误差被修正到分', () => {
    expect(roundMoney(0.1 * 3)).toBe(0.3)
    expect(roundMoney(2.675)).toBe(2.68)
  })

  it('千分位格式化', () => {
    expect(formatMoney(10600)).toBe('10,600.00')
    expect(formatMoney(0)).toBe('0.00')
  })
})

describe('invoice-gen / parseInvoiceDate', () => {
  it('合法日期解析并补零', () => {
    expect(parseInvoiceDate('2026-9-7')).toBe('2026-09-07')
    expect(parseInvoiceDate('2026/12/31')).toBe('2026-12-31')
  })

  it('非法格式抛 invalidDate', () => {
    expectKey(() => parseInvoiceDate('2026-13'), 'invoice.error.invalidDate')
    expectKey(() => parseInvoiceDate('not-a-date'), 'invoice.error.invalidDate')
  })

  it('月份越界抛 invalidDate', () => {
    expectKey(() => parseInvoiceDate('2026-13-01'), 'invoice.error.invalidDate')
    expectKey(() => parseInvoiceDate('2026-00-10'), 'invoice.error.invalidDate')
  })

  it('日期越界抛 invalidDate（含闰年）', () => {
    expectKey(() => parseInvoiceDate('2023-02-29'), 'invoice.error.invalidDate')
    expectKey(() => parseInvoiceDate('2026-02-30'), 'invoice.error.invalidDate')
    expect(parseInvoiceDate('2024-02-29')).toBe('2024-02-29')
  })
})

describe('invoice-gen / parseTaxRate', () => {
  it('留空为 0', () => {
    expect(parseTaxRate('')).toBe(0)
    expect(parseTaxRate('   ')).toBe(0)
  })

  it('常规税率与百分号后缀', () => {
    expect(parseTaxRate('6')).toBe(6)
    expect(parseTaxRate('6%')).toBe(6)
    expect(parseTaxRate('13.5')).toBe(13.5)
  })

  it('非数字抛 invalidTaxRate', () => {
    expectKey(() => parseTaxRate('abc'), 'invoice.error.invalidTaxRate')
  })

  it('超出 0–100 范围抛 invalidTaxRate', () => {
    expectKey(() => parseTaxRate('101'), 'invoice.error.invalidTaxRate')
    expectKey(() => parseTaxRate('-1'), 'invoice.error.invalidTaxRate')
  })

  it('极大数字（转 Infinity）抛 invalidTaxRate', () => {
    expectKey(() => parseTaxRate('9'.repeat(400)), 'invoice.error.invalidTaxRate')
  })
})

describe('invoice-gen / parseItems', () => {
  it('正常解析三行明细', () => {
    const items = parseItems('网站设计服务,1,8000\n域名续费,2,100')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      name: '网站设计服务',
      quantity: 1,
      unitPrice: 8000,
      amount: 8000,
    })
    expect(items[1]).toMatchObject({ name: '域名续费', quantity: 2, unitPrice: 100, amount: 200 })
  })

  it('空行被跳过', () => {
    expect(parseItems('\n网站设计服务,1,8000\n\n')).toHaveLength(1)
  })

  it('兼容全角逗号', () => {
    const items = parseItems('设计费，2，500')
    expect(items[0]).toMatchObject({ name: '设计费', quantity: 2, unitPrice: 500, amount: 1000 })
  })

  it('行金额做分位四舍五入', () => {
    const items = parseItems('零头,3,0.1')
    expect(items[0].amount).toBe(0.3)
  })

  it('字段不足/过多抛 badItem', () => {
    expectKey(() => parseItems('只有名称'), 'invoice.error.badItem')
    expectKey(() => parseItems('a,b'), 'invoice.error.badItem')
    expectKey(() => parseItems('a,b,c,d'), 'invoice.error.badItem')
  })

  it('名称为空抛 badItem', () => {
    expectKey(() => parseItems(',2,500'), 'invoice.error.badItem')
  })

  it('数量非法抛 invalidQuantity', () => {
    expectKey(() => parseItems('设计费,abc,500'), 'invoice.error.invalidQuantity')
    expectKey(() => parseItems('设计费,0,500'), 'invoice.error.invalidQuantity')
    expectKey(() => parseItems('设计费,-2,500'), 'invoice.error.invalidQuantity')
    expectKey(
      () => parseItems('设计费,' + '9'.repeat(400) + ',500'),
      'invoice.error.invalidQuantity',
    )
  })

  it('单价非法抛 invalidPrice', () => {
    expectKey(() => parseItems('设计费,2,abc'), 'invoice.error.invalidPrice')
    expectKey(() => parseItems('设计费,2,' + '9'.repeat(400)), 'invoice.error.invalidPrice')
  })

  it('单价为 0 允许（赠品行）', () => {
    const items = parseItems('赠品,1,0')
    expect(items[0].amount).toBe(0)
  })

  it('单价为负抛 negativeValue', () => {
    expectKey(() => parseItems('设计费,2,-5'), 'invoice.error.negativeValue')
  })
})

describe('invoice-gen / buildInvoiceData', () => {
  it('全空返回 null（空态）', () => {
    expect(buildInvoiceData(emptyInput, zh)).toBeNull()
  })

  it('明细为空但填了其他字段抛 noItems', () => {
    expectKey(
      () => buildInvoiceData({ ...emptyInput, seller: '星辰科技' }, zh),
      'invoice.error.noItems',
    )
  })

  it('正确计算小计/税额/总计', () => {
    const data = buildInvoiceData(base, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(data.subtotal).toBe(10600)
    expect(data.tax).toBe(636)
    expect(data.total).toBe(11236)
    expect(data.date).toBe('2026-09-27')
  })

  it('日期留空则为空字符串', () => {
    const data = buildInvoiceData({ ...base, date: '' }, zh)
    expect(data?.date).toBe('')
  })

  it('税率留空则税额为 0', () => {
    const data = buildInvoiceData({ ...base, taxRate: '' }, zh)
    expect(data?.tax).toBe(0)
    expect(data?.total).toBe(data?.subtotal)
  })

  it('非法日期抛 invalidDate', () => {
    expectKey(
      () => buildInvoiceData({ ...base, date: '2026-13-01' }, zh),
      'invoice.error.invalidDate',
    )
  })

  it('非法税率抛 invalidTaxRate', () => {
    expectKey(
      () => buildInvoiceData({ ...base, taxRate: 'abc' }, zh),
      'invoice.error.invalidTaxRate',
    )
  })

  it('非法明细行抛 badItem', () => {
    expectKey(() => buildInvoiceData({ ...base, text: '只有名称' }, zh), 'invoice.error.badItem')
  })

  it('销方超长抛 tooLong', () => {
    expectKey(
      () => buildInvoiceData({ ...base, seller: 'x'.repeat(81) }, zh),
      'invoice.error.tooLong',
    )
  })

  it('各字段上限逐个校验', () => {
    const over: Array<[keyof InvoiceInput, number]> = [
      ['text', 3001],
      ['buyer', 81],
      ['number', 41],
      ['date', 21],
      ['taxRate', 11],
      ['notes', 501],
    ]
    for (const [key, len] of over) {
      expectKey(
        () => buildInvoiceData({ ...base, [key]: 'x'.repeat(len) }, zh),
        'invoice.error.tooLong',
      )
    }
  })
})

describe('invoice-gen / formatInvoiceText', () => {
  it('完整数据输出全部行', () => {
    const data = buildInvoiceData(base, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatInvoiceText(data, zh)
    expect(text).toContain('发票号：INV-2026-0001')
    expect(text).toContain('网站设计服务 × 1 @ 8,000.00 = 8,000.00')
    expect(text).toContain('小计：10,600.00')
    expect(text).toContain('税额（6%）：636.00')
    expect(text).toContain('总计：11,236.00')
    expect(text).toContain('备注：请于 15 日内付款')
  })

  it('仅明细时跳过空字段行', () => {
    const data = buildInvoiceData({ ...emptyInput, text: '设计费,2,500' }, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatInvoiceText(data, zh)
    expect(text).not.toContain('发票号')
    expect(text).not.toContain('备注')
    expect(text).toContain('总计：1,000.00')
  })

  it('英文输出使用英文标签', () => {
    const data = buildInvoiceData(base, en)
    if (!data) throw new Error('数据不应为 null')
    expect(formatInvoiceText(data, en)).toContain('Total：')
  })
})

describe('invoice-gen / toPlainText', () => {
  it('空输入返回空字符串', () => {
    expect(toPlainText(emptyInput, zh)).toBe('')
  })

  it('合法输入返回纯文本', () => {
    expect(toPlainText(base, zh)).toContain('总计')
  })

  it('非法输入返回空字符串（不抛错）', () => {
    expect(toPlainText({ ...base, text: '只有名称' }, zh)).toBe('')
    expect(toPlainText({ ...base, text: 'x'.repeat(3001) }, zh)).toBe('')
  })
})

describe('invoice-gen / exportFileName', () => {
  it('用发票号生成文件名', () => {
    const data = buildInvoiceData(base, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('invoice-INV-2026-0001.png')
  })

  it('无发票号时用 untitled 兜底', () => {
    const data = buildInvoiceData({ ...base, number: '' }, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('invoice-untitled.png')
  })

  it('过滤发票号中的非法字符', () => {
    const data = buildInvoiceData({ ...base, number: 'INV/2026:0001' }, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('invoice-INV20260001.png')
  })
})

describe('invoice-gen / localizeError', () => {
  it('InvoiceError 走 i18n（中英）', () => {
    expect(localizeError(new InvoiceError('invoice.error.noItems'), zh)).toBe('请至少填写一项明细')
    expect(localizeError(new InvoiceError('invoice.error.noItems'), en)).toBe(
      'Please enter at least one line item',
    )
  })

  it('带参数的错误正确插值', () => {
    expect(localizeError(new InvoiceError('invoice.error.badItem', { line: 2 }), zh)).toBe(
      '第 2 行格式错误，应为「名称,数量,单价」',
    )
  })

  it('普通 Error 原样展示', () => {
    expect(localizeError(new Error('boom'), zh)).toBe('boom')
  })

  it('非 Error 值转字符串', () => {
    expect(localizeError('oops', zh)).toBe('oops')
  })
})
