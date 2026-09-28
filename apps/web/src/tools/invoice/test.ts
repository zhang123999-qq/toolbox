import { describe, expect, it } from 'vitest'
import {
  buildText,
  calcTotals,
  createInvoiceData,
  formatMoney,
  parseItems,
  todayISO,
} from './utils'
import type { InvoiceData } from './utils'

describe('invoice / parseItems', () => {
  it('半角逗号分隔', () => {
    expect(parseItems('咨询服务,2,500')).toEqual([{ name: '咨询服务', qty: 2, price: 500 }])
  })

  it('全角逗号分隔', () => {
    expect(parseItems('咨询服务，2，500')).toEqual([{ name: '咨询服务', qty: 2, price: 500 }])
  })

  it('空格分隔', () => {
    expect(parseItems('咨询服务 2 500')).toEqual([{ name: '咨询服务', qty: 2, price: 500 }])
  })

  it('制表符分隔', () => {
    expect(parseItems('咨询服务\t2\t500')).toEqual([{ name: '咨询服务', qty: 2, price: 500 }])
  })

  it('混合分隔符', () => {
    expect(parseItems('咨询服务,2，500')).toEqual([{ name: '咨询服务', qty: 2, price: 500 }])
  })

  it('空行跳过，多行解析', () => {
    expect(parseItems('咨询服务,2,500\n\n技术支持,1,1200\n')).toEqual([
      { name: '咨询服务', qty: 2, price: 500 },
      { name: '技术支持', qty: 1, price: 1200 },
    ])
  })

  it('错误行号按原文物理行号（含空行）', () => {
    expect(() => parseItems('咨询服务,2,500\n\n坏行')).toThrow(/第 3 行格式错误/)
  })

  it('段数不对报错', () => {
    expect(() => parseItems('只有两段,2')).toThrow(/第 1 行格式错误，应为"名称,数量，单价"/)
    expect(() => parseItems('a,b,2,500')).toThrow(/第 1 行格式错误/)
  })

  it('名称为空报错', () => {
    expect(() => parseItems(',2,500')).toThrow(/第 1 行名称不能为空/)
  })

  it('数量非法报错', () => {
    expect(() => parseItems('咨询服务,abc,500')).toThrow(/第 1 行数量必须大于 0/)
    expect(() => parseItems('咨询服务,0,500')).toThrow(/第 1 行数量必须大于 0/)
    expect(() => parseItems('咨询服务,-1,500')).toThrow(/第 1 行数量必须大于 0/)
    expect(() => parseItems('咨询服务,,500')).toThrow(/第 1 行数量必须大于 0/)
  })

  it('数量支持小数', () => {
    expect(parseItems('打印纸,2.5,20')).toEqual([{ name: '打印纸', qty: 2.5, price: 20 }])
  })

  it('单价非法报错', () => {
    expect(() => parseItems('咨询服务,2,abc')).toThrow(/第 1 行单价不能为负数/)
    expect(() => parseItems('咨询服务,2,-5')).toThrow(/第 1 行单价不能为负数/)
    expect(() => parseItems('咨询服务,2,')).toThrow(/第 1 行单价不能为负数/)
  })

  it('单价为 0 允许（赠品）', () => {
    expect(parseItems('赠品,1,0')).toEqual([{ name: '赠品', qty: 1, price: 0 }])
  })

  it('全部空行报错', () => {
    expect(() => parseItems('')).toThrow(/请至少填写一项明细/)
    expect(() => parseItems('  \n\t\n')).toThrow(/请至少填写一项明细/)
  })
})

describe('invoice / calcTotals', () => {
  it('示例：小计 2200，税 6% = 132，总额 2332', () => {
    const totals = calcTotals(
      [
        { name: '咨询服务', qty: 2, price: 500 },
        { name: '技术支持', qty: 1, price: 1200 },
      ],
      6,
    )
    expect(totals).toEqual({ count: 2, subtotal: 2200, tax: 132, total: 2332 })
  })

  it('税率 0 时税额为 0', () => {
    const totals = calcTotals([{ name: 'a', qty: 1, price: 100 }], 0)
    expect(totals.tax).toBe(0)
    expect(totals.total).toBe(100)
  })

  it('分转整数求和避免浮点误差：0.1 × 3 = 0.3', () => {
    const totals = calcTotals([{ name: 'a', qty: 3, price: 0.1 }], 0)
    expect(totals.subtotal).toBe(0.3)
  })

  it('空数组合计全 0', () => {
    expect(calcTotals([], 6)).toEqual({ count: 0, subtotal: 0, tax: 0, total: 0 })
  })
})

describe('invoice / formatMoney', () => {
  it('千分位 + 2 位小数', () => {
    expect(formatMoney(1234.5)).toBe('¥1,234.50')
    expect(formatMoney(2332)).toBe('¥2,332.00')
    expect(formatMoney(1000000)).toBe('¥1,000,000.00')
  })

  it('零', () => {
    expect(formatMoney(0)).toBe('¥0.00')
  })

  it('负数', () => {
    expect(formatMoney(-1234.5)).toBe('-¥1,234.50')
  })

  it('四舍五入到分', () => {
    expect(formatMoney(2.345)).toBe('¥2.35')
    expect(formatMoney(2.344)).toBe('¥2.34')
  })

  it('非有限数字抛错', () => {
    expect(() => formatMoney(NaN)).toThrow(/金额不是有效数字/)
    expect(() => formatMoney(Infinity)).toThrow(/金额不是有效数字/)
  })
})

const FULL: InvoiceData = {
  buyer: '示例科技有限公司',
  seller: '某某服务有限公司',
  invoiceNo: 'INV-001',
  date: '2026-09-27',
  items: [
    { name: '咨询服务', qty: 2, price: 500 },
    { name: '技术支持', qty: 1, price: 1200 },
  ],
  totals: { count: 2, subtotal: 2200, tax: 132, total: 2332 },
  taxRate: 6,
  remark: '月结',
}

describe('invoice / buildText', () => {
  it('完整发票包含所有区块', () => {
    const text = buildText(FULL)
    expect(text).toContain('发票')
    expect(text).toContain('发票号：INV-001')
    expect(text).toContain('日期：2026-09-27')
    expect(text).toContain('购买方：示例科技有限公司')
    expect(text).toContain('销售方：某某服务有限公司')
    expect(text).toContain('1. 咨询服务 × 2 @ ¥500.00 = ¥1,000.00')
    expect(text).toContain('2. 技术支持 × 1 @ ¥1,200.00 = ¥1,200.00')
    expect(text).toContain('共 2 项')
    expect(text).toContain('小计：¥2,200.00')
    expect(text).toContain('税额（6%）：¥132.00')
    expect(text).toContain('总额：¥2,332.00')
    expect(text).toContain('备注：月结')
  })

  it('空的可选字段被省略，空备注显示"无"', () => {
    const text = buildText({
      ...FULL,
      buyer: '  ',
      seller: '',
      invoiceNo: '',
      date: '',
      remark: '   ',
    })
    expect(text).not.toContain('购买方')
    expect(text).not.toContain('销售方')
    expect(text).not.toContain('发票号')
    expect(text).not.toContain('日期')
    expect(text).toContain('备注：无')
  })
})

describe('invoice / createInvoiceData', () => {
  it('从表单输入组装发票数据', () => {
    const data = createInvoiceData(
      {
        buyer: '买',
        seller: '卖',
        invoiceNo: 'N1',
        date: '2026-09-27',
        itemsText: '咨询服务,2,500',
        remark: '',
      },
      6,
    )
    expect(data.items).toHaveLength(1)
    expect(data.totals).toEqual({ count: 1, subtotal: 1000, tax: 60, total: 1060 })
    expect(data.taxRate).toBe(6)
    expect(data.buyer).toBe('买')
  })

  it('明细非法时透出解析错误', () => {
    expect(() =>
      createInvoiceData(
        { buyer: '', seller: '', invoiceNo: '', date: '', itemsText: '坏行', remark: '' },
        6,
      ),
    ).toThrow(/第 1 行格式错误/)
  })
})

describe('invoice / todayISO', () => {
  it('返回本地 YYYY-MM-DD', () => {
    const d = new Date()
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
    expect(todayISO()).toBe(expected)
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
