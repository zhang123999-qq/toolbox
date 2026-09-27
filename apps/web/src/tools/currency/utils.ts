import type { Translate } from '../../i18n'
import { CURRENCY_IDS } from '../../lib/currency'
import { inputSchema, optionsSchema } from './schema'
import type { CurrencyInput, CurrencyOptions } from './schema'

/** 支持的地区格式（BCP 47） */
export const LOCALE_IDS = [
  'zh-CN',
  'zh-TW',
  'en-US',
  'en-GB',
  'ja-JP',
  'ko-KR',
  'de-DE',
  'fr-FR',
] as const

/** 货币金额的显示方式（Intl.NumberFormat currencyDisplay 取值） */
export const DISPLAY_MODES = ['symbol', 'code', 'name'] as const

/** 小数位选项：auto=按币种默认（如 JPY 0 位、USD 2 位） */
export const DECIMAL_CHOICES = ['auto', '0', '1', '2', '3', '4', '5', '6'] as const

/** 小数位合法取值集合（auto 除外） */
const DECIMAL_DIGITS = ['0', '1', '2', '3', '4', '5', '6'] as const

/** 校验货币代码（大小写不敏感，统一转大写） */
function parseCurrency(raw: string, t: Translate): string {
  const code = raw.trim().toUpperCase()
  if (!CURRENCY_IDS.includes(code)) throw new Error(t('error.unknownCurrency', { code: raw }))
  return code
}

/** 校验地区格式 */
function parseLocale(raw: string, t: Translate): string {
  const locale = raw.trim()
  if (!(LOCALE_IDS as readonly string[]).includes(locale)) {
    throw new Error(t('currency.error.unknownLocale', { code: raw }))
  }
  return locale
}

/** 校验显示方式 */
function parseDisplay(raw: string, t: Translate): 'symbol' | 'code' | 'name' {
  const display = raw.trim()
  if (!(DISPLAY_MODES as readonly string[]).includes(display)) {
    throw new Error(t('currency.error.unknownDisplay', { value: raw }))
  }
  return display as 'symbol' | 'code' | 'name'
}

/** 校验小数位：auto → undefined（按币种默认），数字串 → 具体位数 */
function parseDecimals(raw: string, t: Translate): number | undefined {
  const decimals = raw.trim()
  if (decimals === 'auto') return undefined
  if (!(DECIMAL_DIGITS as readonly string[]).includes(decimals)) {
    throw new Error(t('currency.error.invalidDecimals', { value: raw }))
  }
  return Number(decimals)
}

/**
 * T2 同步入口：Intl.NumberFormat 格式化金额。
 * 空输入返回空串；金额非法（非数字 / Infinity）抛双语错误；负数合法（负金额正常格式化）。
 */
export function transform(input: CurrencyInput, options: CurrencyOptions, t: Translate): string {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)

  const text = parsedInput.text.trim()
  if (text === '') return ''

  const amount = Number(text)
  if (!Number.isFinite(amount)) throw new Error(t('error.invalidAmount', { value: text }))

  const currency = parseCurrency(parsedOptions.currency, t)
  const locale = parseLocale(parsedOptions.locale, t)
  const display = parseDisplay(parsedOptions.display, t)
  const digits = parseDecimals(parsedOptions.decimals, t)

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: display,
      ...(digits === undefined
        ? {}
        : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    }).format(amount)
  } catch {
    // 校验已前置，这里只防 Intl 实现差异导致的意外 RangeError
    throw new Error(t('currency.error.formatFailed'))
  }
}
