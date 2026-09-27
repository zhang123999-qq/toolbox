/**
 * 常用货币代码表（ISO 4217）。
 *
 * 汇率换算（#364 exchange-rate）与货币格式（#365 currency）共用。
 * 按 docs/source-organization.md「共用逻辑一律上提到 lib」：
 * 工具之间禁止互相 import，因此这份表放在 lib，由两个工具各自引用。
 */
export const CURRENCY_IDS: readonly string[] = [
  'CNY',
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'HKD',
  'TWD',
  'MOP',
  'AUD',
  'NZD',
  'CAD',
  'CHF',
  'SGD',
  'KRW',
  'INR',
  'THB',
  'MYR',
  'IDR',
  'PHP',
  'VND',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RUB',
  'TRY',
  'AED',
  'SAR',
  'BRL',
  'MXN',
  'ZAR',
]
