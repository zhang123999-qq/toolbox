// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import {
  AMOUNT_MAX,
  DATE_MAX,
  NUMBER_MAX,
  PAYEE_MAX,
  PAYER_MAX,
  REASON_MAX,
  inputSchema,
  optionsSchema,
} from './schema'
import type { ReceiptInput, ReceiptOptions } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class ReceiptError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'ReceiptError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：ReceiptError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof ReceiptError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** 文件名中的非法字符：导出 PNG 文件名用 */
const FILENAME_BAD_CHARS = /[\\/:*?"<>|\p{C}]/gu
/** 文件名兜底词（ASCII，避免各平台编码问题） */
const FILENAME_FALLBACK = 'untitled'
/** 导出 PNG 文件名前缀 */
const EXPORT_PREFIX = 'receipt'
/** 金额保留小数位 */
const MONEY_DECIMALS = 2
/** 数字字面量（整数或小数，可为负，负值另行报错） */
const NUMBER_RE = /^-?\d+(\.\d+)?$/
/** 严格日期：YYYY-MM-DD（兼容 YYYY/M/D） */
const DATE_RE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/

export interface ReceiptData {
  readonly payer: string
  readonly payee: string
  readonly amount: number
  readonly date: string
  readonly reason: string
  readonly number: string
  readonly method: string
}

function checkLength(value: string, max: number, label: MessageKey, t: Translate): void {
  if (value.length > max) {
    throw new ReceiptError('receipt.error.tooLong', { field: t(label), max })
  }
}

/** 金额四舍五入到分，避免浮点误差 */
export function roundMoney(value: number): number {
  const factor = 10 ** MONEY_DECIMALS
  return Math.round(value * factor) / factor
}

/** 千分位 + 保留 2 位小数：1234.5 → "1,234.50" */
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
export function parseReceiptDate(raw: string): string {
  const value = raw.trim()
  const m = DATE_RE.exec(value)
  if (!m) throw new ReceiptError('receipt.error.invalidDate', { value })
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new ReceiptError('receipt.error.invalidDate', { value })
  }
  const pad = (n: number): string => (n < 10 ? '0' + String(n) : String(n))
  return `${year}-${pad(month)}-${pad(day)}`
}

/**
 * 解析金额：须为有限正数。
 * 非数字 / 无穷大 / 0 → invalidAmount；负数 → negativeAmount（双语）。
 */
export function parseAmount(raw: string): number {
  const value = raw.trim()
  if (!NUMBER_RE.test(value)) {
    throw new ReceiptError('error.invalidAmount', { value })
  }
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount === 0) {
    throw new ReceiptError('error.invalidAmount', { value })
  }
  if (amount < 0) {
    throw new ReceiptError('error.negativeAmount')
  }
  return amount
}

/**
 * 组装收据数据（纯函数）。
 * 全空 → 返回 null（空态）；金额为空但填了其他字段 → emptyAmount；
 * 金额/日期非法 → 对应 keyed 错误。
 */
export function buildReceiptData(
  input: ReceiptInput,
  options: ReceiptOptions,
  t: Translate,
): ReceiptData | null {
  const reason = (input.text as string).trim()
  const payer = (input.payer as string).trim()
  const payee = (input.payee as string).trim()
  const amountRaw = (input.amount as string).trim()
  const dateRaw = (input.date as string).trim()
  const number = (input.number as string).trim()

  const allEmpty =
    reason === '' &&
    payer === '' &&
    payee === '' &&
    amountRaw === '' &&
    dateRaw === '' &&
    number === ''
  if (allEmpty) return null

  // 长度校验走双语 keyed 错误（面向用户）；Zod 契约随后做类型兜底
  checkLength(reason, REASON_MAX, 'receipt.field.reason', t)
  checkLength(payer, PAYER_MAX, 'receipt.field.payer', t)
  checkLength(payee, PAYEE_MAX, 'receipt.field.payee', t)
  checkLength(amountRaw, AMOUNT_MAX, 'receipt.field.amount', t)
  checkLength(dateRaw, DATE_MAX, 'receipt.field.date', t)
  checkLength(number, NUMBER_MAX, 'receipt.field.number', t)
  inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)

  if (amountRaw === '') throw new ReceiptError('receipt.error.emptyAmount')
  const amount = parseAmount(amountRaw)
  const date = dateRaw === '' ? '' : parseReceiptDate(dateRaw)
  return {
    payer,
    payee,
    amount: roundMoney(amount),
    date,
    reason,
    number,
    method: parsedOptions.method,
  }
}

/** 收据的纯文本版本（复制 / 下载用），双语由 t 决定 */
export function formatReceiptText(data: ReceiptData, t: Translate): string {
  const lines: string[] = []
  if (data.number !== '') lines.push(`${t('receipt.field.number')}：${data.number}`)
  if (data.date !== '') lines.push(`${t('receipt.field.date')}：${data.date}`)
  lines.push('')
  if (data.payer !== '') lines.push(`${t('receipt.field.payer')}：${data.payer}`)
  if (data.payee !== '') lines.push(`${t('receipt.field.payee')}：${data.payee}`)
  lines.push(`${t('receipt.field.amount')}：${formatMoney(data.amount)}`)
  if (data.method !== '') lines.push(`${t('receipt.method')}：${data.method}`)
  if (data.reason !== '') {
    lines.push('')
    lines.push(`${t('receipt.field.reason')}：`)
    lines.push(data.reason)
  }
  return lines.join('\n')
}

/**
 * T3 模板的 toText 入口：安全包装，任何非法输入都返回 ''（复制 / 下载不抛错）。
 */
export function toPlainText(input: ReceiptInput, options: ReceiptOptions, t: Translate): string {
  try {
    const data = buildReceiptData(input, options, t)
    return data ? formatReceiptText(data, t) : ''
  } catch {
    return ''
  }
}

/** 导出 PNG 的文件名：`receipt-<收据号>.png`，无号/非法字符时兜底 */
export function exportFileName(data: ReceiptData): string {
  const clean = data.number.replace(FILENAME_BAD_CHARS, '').trim()
  const stem = clean === '' ? FILENAME_FALLBACK : clean
  return `${EXPORT_PREFIX}-${stem}.png`
}
