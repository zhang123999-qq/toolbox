import type { InvoiceInput } from './schema'

/** 发票明细行 */
export interface InvoiceItem {
  readonly name: string
  readonly qty: number
  readonly price: number
}

/** 合计 */
export interface InvoiceTotals {
  readonly count: number
  readonly subtotal: number
  readonly tax: number
  readonly total: number
}

/** 纯文本发票所需的数据 */
export interface InvoiceData {
  readonly buyer: string
  readonly seller: string
  readonly invoiceNo: string
  readonly date: string
  readonly items: readonly InvoiceItem[]
  readonly totals: InvoiceTotals
  readonly taxRate: number
  readonly remark: string
}

/**
 * 明细行分隔符：半角逗号 / 全角逗号 / 空白（空格、制表符）。
 * 空白连写折叠为空格分隔；逗号连写保留空段，以便报出「数量/单价非法」而非格式错误。
 */
const SEP = /[ \t]+|[,，]/

/**
 * 解析明细文本，每行「名称,数量,单价」。
 * 空行跳过；错误信息里的行号是原文物理行号（1 起）。
 * 名称本身不能包含分隔符（否则无法与数量/单价区分）。
 */
export function parseItems(text: string): InvoiceItem[] {
  const items: InvoiceItem[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const line = lines[i].trim()
    if (line === '') continue
    const parts = line.split(SEP)
    if (parts.length !== 3) {
      throw new Error(`第 ${lineNo} 行格式错误，应为"名称,数量，单价"`)
    }
    const name = parts[0].trim()
    if (name === '') throw new Error(`第 ${lineNo} 行名称不能为空`)
    const qty = Number(parts[1])
    if (parts[1].trim() === '' || Number.isNaN(qty) || qty <= 0) {
      throw new Error(`第 ${lineNo} 行数量必须大于 0`)
    }
    const price = Number(parts[2])
    if (parts[2].trim() === '' || Number.isNaN(price) || price < 0) {
      throw new Error(`第 ${lineNo} 行单价不能为负数`)
    }
    items.push({ name, qty, price })
  }
  if (items.length === 0) throw new Error('请至少填写一项明细')
  return items
}

/**
 * 合计：小计先转「分」用整数求和再转回元，避免 0.1+0.2 类浮点误差；
 * 税额 = 小计 × 税率 / 100；总额 = 小计 + 税额。
 */
export function calcTotals(items: readonly InvoiceItem[], taxRate: number): InvoiceTotals {
  let subtotalCents = 0
  for (const it of items) {
    subtotalCents += Math.round(it.qty * it.price * 100)
  }
  const subtotal = subtotalCents / 100
  const tax = (subtotal * taxRate) / 100
  return { count: items.length, subtotal, tax, total: subtotal + tax }
}

/**
 * 金额格式化：¥1,234.50（千分位 + 2 位小数）。
 * 手动实现，不用 Intl，保证任何环境输出一致、测试确定。
 */
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) throw new Error('金额不是有效数字')
  const sign = n < 0 ? '-' : ''
  // +EPSILON 让 2.675 这类二进制存不下的小数按十进制直觉四舍五入
  const cents = Math.round(Math.abs(n) * 100 + Number.EPSILON)
  const intPart = Math.floor(cents / 100)
  const fracPart = cents % 100
  const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}¥${intStr}.${String(fracPart).padStart(2, '0')}`
}

/** 组装纯文本发票（供复制 / 下载用） */
export function buildText(inv: InvoiceData): string {
  const lines: string[] = ['发票']
  if (inv.invoiceNo.trim() !== '') lines.push(`发票号：${inv.invoiceNo.trim()}`)
  if (inv.date.trim() !== '') lines.push(`日期：${inv.date.trim()}`)
  if (inv.buyer.trim() !== '') lines.push(`购买方：${inv.buyer.trim()}`)
  if (inv.seller.trim() !== '') lines.push(`销售方：${inv.seller.trim()}`)
  lines.push('--------------------------------')
  inv.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.name} × ${it.qty} @ ${formatMoney(it.price)} = ${formatMoney(it.qty * it.price)}`,
    )
  })
  lines.push('--------------------------------')
  lines.push(`共 ${inv.totals.count} 项`)
  lines.push(`小计：${formatMoney(inv.totals.subtotal)}`)
  lines.push(`税额（${inv.taxRate}%）：${formatMoney(inv.totals.tax)}`)
  lines.push(`总额：${formatMoney(inv.totals.total)}`)
  lines.push(`备注：${inv.remark.trim() === '' ? '无' : inv.remark.trim()}`)
  return lines.join('\n')
}

/** 从表单输入组装发票数据：解析明细 + 计算合计 */
export function createInvoiceData(input: InvoiceInput, taxRate: number): InvoiceData {
  const items = parseItems(input.itemsText)
  return {
    buyer: input.buyer,
    seller: input.seller,
    invoiceNo: input.invoiceNo,
    date: input.date,
    items,
    totals: calcTotals(items, taxRate),
    taxRate,
    remark: input.remark,
  }
}

/** 本地日期 YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
