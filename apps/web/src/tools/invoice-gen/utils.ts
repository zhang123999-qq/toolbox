// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import {
  BUYER_MAX,
  DATE_MAX,
  ITEMS_MAX,
  NOTES_MAX,
  NUMBER_MAX,
  SELLER_MAX,
  TAX_RATE_MAX,
  inputSchema,
} from './schema'
import type { InvoiceInput } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class InvoiceError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'InvoiceError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：InvoiceError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof InvoiceError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** 文件名中的非法字符：导出 PNG 文件名用 */
const FILENAME_BAD_CHARS = /[\\/:*?"<>|\p{C}]/gu
/** 文件名兜底词（ASCII，避免各平台编码问题） */
const FILENAME_FALLBACK = 'untitled'
/** 导出 PNG 文件名前缀 */
const EXPORT_PREFIX = 'invoice'
/** 金额保留小数位 */
const MONEY_DECIMALS = 2
/** 税率上限（%） */
const MAX_TAX_RATE = 100

/** 明细分隔符：半角 / 全角逗号 */
const ITEM_SPLIT_RE = /[,，]/
/** 数字字面量（整数或小数，可为负，负值另行报错） */
const NUMBER_RE = /^-?\d+(\.\d+)?$/
/** 严格日期：YYYY-MM-DD（兼容 YYYY/M/D） */
const DATE_RE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/

export interface InvoiceItem {
  readonly name: string
  readonly quantity: number
  readonly unitPrice: number
  /** 行金额 = round2(quantity × unitPrice) */
  readonly amount: number
}

export interface InvoiceData {
  readonly seller: string
  readonly buyer: string
  readonly number: string
  readonly date: string
  readonly items: readonly InvoiceItem[]
  readonly taxRate: number
  readonly notes: string
  readonly subtotal: number
  readonly tax: number
  readonly total: number
}

function checkLength(value: string, max: number, label: MessageKey, t: Translate): void {
  if (value.length > max) {
    throw new InvoiceError('invoice.error.tooLong', { field: t(label), max })
  }
}

/** 金额四舍五入到分，避免 0.1×3=0.30000000004 这类浮点误差 */
export function roundMoney(value: number): number {
  const factor = 10 ** MONEY_DECIMALS
  return Math.round(value * factor) / factor
}

/** 千分位 + 保留 2 位小数：10600 → "10,600.00" */
export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: MONEY_DECIMALS,
    maximumFractionDigits: MONEY_DECIMALS,
  })
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

/** 严格解析 YYYY-MM-DD，非法抛 invalidDate（双语） */
export function parseInvoiceDate(raw: string): string {
  const value = raw.trim()
  const m = DATE_RE.exec(value)
  if (!m) throw new InvoiceError('invoice.error.invalidDate', { value })
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new InvoiceError('invoice.error.invalidDate', { value })
  }
  const pad = (n: number): string => (n < 10 ? '0' + String(n) : String(n))
  return `${year}-${pad(month)}-${pad(day)}`
}

/** 解析税率：留空=0；允许末尾带 %；须为 0–100 的有限数字 */
export function parseTaxRate(raw: string): number {
  const value = raw.trim().replace(/%$/, '')
  if (value === '') return 0
  if (!NUMBER_RE.test(value)) {
    throw new InvoiceError('invoice.error.invalidTaxRate', { value: raw.trim() })
  }
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_TAX_RATE) {
    throw new InvoiceError('invoice.error.invalidTaxRate', { value: raw.trim() })
  }
  return rate
}

/** 解析数量：须为有限正数 */
function parseQuantity(raw: string, line: number): number {
  const value = raw.trim()
  if (!NUMBER_RE.test(value)) {
    throw new InvoiceError('invoice.error.invalidQuantity', { line, value })
  }
  const qty = Number(value)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new InvoiceError('invoice.error.invalidQuantity', { line, value })
  }
  return qty
}

/** 解析单价：须为有限非负数（负数单独报 negativeValue） */
function parseUnitPrice(raw: string, line: number): number {
  const value = raw.trim()
  if (!NUMBER_RE.test(value)) {
    throw new InvoiceError('invoice.error.invalidPrice', { line, value })
  }
  const price = Number(value)
  if (!Number.isFinite(price)) {
    throw new InvoiceError('invoice.error.invalidPrice', { line, value })
  }
  if (price < 0) {
    throw new InvoiceError('invoice.error.negativeValue', { line })
  }
  return price
}

/**
 * 解析明细：每行「名称,数量,单价」（兼容全角逗号），空行跳过。
 * 格式不对 / 名称为空 → badItem；数量/单价非法 → 对应错误。
 */
export function parseItems(text: string): InvoiceItem[] {
  const items: InvoiceItem[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1
    const line = lines[i].trim()
    if (line === '') continue
    const parts = line.split(ITEM_SPLIT_RE)
    if (parts.length !== 3 || parts[0].trim() === '') {
      throw new InvoiceError('invoice.error.badItem', { line: lineNo })
    }
    const quantity = parseQuantity(parts[1], lineNo)
    const unitPrice = parseUnitPrice(parts[2], lineNo)
    items.push({
      name: parts[0].trim(),
      quantity,
      unitPrice,
      amount: roundMoney(quantity * unitPrice),
    })
  }
  return items
}

/**
 * 组装发票数据（纯函数）。
 * 全空 → 返回 null（空态）；明细为空但填了其他字段 → noItems；
 * 明细/税率/日期非法 → 对应 keyed 错误；金额做分位四舍五入。
 */
export function buildInvoiceData(input: InvoiceInput, t: Translate): InvoiceData | null {
  const text = (input.text as string).trim()
  const seller = (input.seller as string).trim()
  const buyer = (input.buyer as string).trim()
  const number = (input.number as string).trim()
  const dateRaw = (input.date as string).trim()
  const taxRateRaw = (input.taxRate as string).trim()
  const notes = (input.notes as string).trim()

  const allEmpty =
    text === '' &&
    seller === '' &&
    buyer === '' &&
    number === '' &&
    dateRaw === '' &&
    taxRateRaw === '' &&
    notes === ''
  if (allEmpty) return null

  // 长度校验走双语 keyed 错误（面向用户）；Zod 契约随后做类型兜底
  checkLength(text, ITEMS_MAX, 'invoice.field.items', t)
  checkLength(seller, SELLER_MAX, 'invoice.field.seller', t)
  checkLength(buyer, BUYER_MAX, 'invoice.field.buyer', t)
  checkLength(number, NUMBER_MAX, 'invoice.field.number', t)
  checkLength(dateRaw, DATE_MAX, 'invoice.field.date', t)
  checkLength(taxRateRaw, TAX_RATE_MAX, 'invoice.field.taxRate', t)
  checkLength(notes, NOTES_MAX, 'invoice.field.notes', t)
  inputSchema.parse(input)

  if (text === '') throw new InvoiceError('invoice.error.noItems')
  const items = parseItems(text)
  const taxRate = parseTaxRate(taxRateRaw)
  const date = dateRaw === '' ? '' : parseInvoiceDate(dateRaw)

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0))
  const tax = roundMoney((subtotal * taxRate) / MAX_TAX_RATE)
  const total = roundMoney(subtotal + tax)
  return { seller, buyer, number, date, items, taxRate, notes, subtotal, tax, total }
}

/** 发票的纯文本版本（复制 / 下载用），双语由 t 决定 */
export function formatInvoiceText(data: InvoiceData, t: Translate): string {
  const lines: string[] = []
  if (data.number !== '') lines.push(`${t('invoice.field.number')}：${data.number}`)
  if (data.date !== '') lines.push(`${t('invoice.field.date')}：${data.date}`)
  if (data.seller !== '') lines.push(`${t('invoice.field.seller')}：${data.seller}`)
  if (data.buyer !== '') lines.push(`${t('invoice.field.buyer')}：${data.buyer}`)
  lines.push('')
  lines.push(t('invoice.field.items') + '：')
  for (const item of data.items) {
    lines.push(
      `${item.name} × ${item.quantity} @ ${formatMoney(item.unitPrice)} = ${formatMoney(item.amount)}`,
    )
  }
  lines.push('')
  lines.push(`${t('invoice.label.subtotal')}：${formatMoney(data.subtotal)}`)
  lines.push(`${t('invoice.label.tax')}（${data.taxRate}%）：${formatMoney(data.tax)}`)
  lines.push(`${t('invoice.label.total')}：${formatMoney(data.total)}`)
  if (data.notes !== '') {
    lines.push('')
    lines.push(`${t('invoice.field.notes')}：${data.notes}`)
  }
  return lines.join('\n')
}

/**
 * T3 模板的 toText 入口：安全包装，任何非法输入都返回 ''（复制 / 下载不抛错）。
 */
export function toPlainText(input: InvoiceInput, t: Translate): string {
  try {
    const data = buildInvoiceData(input, t)
    return data ? formatInvoiceText(data, t) : ''
  } catch {
    return ''
  }
}

/** 导出 PNG 的文件名：`invoice-<发票号>.png`，无号/非法字符时兜底 */
export function exportFileName(data: InvoiceData): string {
  const clean = data.number.replace(FILENAME_BAD_CHARS, '').trim()
  const stem = clean === '' ? FILENAME_FALLBACK : clean
  return `${EXPORT_PREFIX}-${stem}.png`
}
