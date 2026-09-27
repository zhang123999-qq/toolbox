import type { Translate } from '../../i18n'
import { CURRENCY_IDS } from '../../lib/currency'
import { inputSchema, optionsSchema } from './schema'
import type { ExchangeRateInput, ExchangeRateOptions } from './schema'

/**
 * 汇率接口：exchangerate.host 的 /convert 端点（用户自备 access_key）。
 * 数据流向：请求由浏览器直接发往该接口，不经本项目任何服务器；
 * API Key 只保存在当前页面的输入框里（不写 localStorage、不发往别处）。
 */
const API_ENDPOINT = 'https://api.exchangerate.host/convert'

/** 单次请求的超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 30_000

/** 接口错误信息的最大截断长度（防超长错误体污染输出） */
const ERROR_INFO_MAX_LENGTH = 300

/** /convert 端点的响应体（只取用到的字段，其余一概不猜） */
interface ConvertResponse {
  readonly success?: boolean
  readonly result?: unknown
  readonly info?: { readonly rate?: unknown }
  readonly error?: { readonly code?: unknown; readonly info?: unknown }
}

/** 拼请求 URL：Key 与参数全部 encode，避免特殊字符破坏查询串 */
export function buildUrl(apiKey: string, from: string, to: string, amountText: string): string {
  const params =
    `access_key=${encodeURIComponent(apiKey)}` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}` +
    `&amount=${encodeURIComponent(amountText)}`
  return `${API_ENDPOINT}?${params}`
}

/** 去浮点噪声、去尾零：0.1+0.2 → "0.3" */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** 校验金额：有限数字、非负（汇率换算的负金额无意义） */
function parseAmount(raw: string, t: Translate): number {
  const text = raw.trim()
  const value = Number(text)
  if (!Number.isFinite(value)) throw new Error(t('error.invalidAmount', { value: text }))
  if (value < 0) throw new Error(t('exchangeRate.error.negativeAmount'))
  return value
}

/** 校验货币代码（大小写不敏感，统一转大写） */
function parseCurrency(raw: string, t: Translate): string {
  const code = raw.trim().toUpperCase()
  if (!CURRENCY_IDS.includes(code)) throw new Error(t('error.unknownCurrency', { code: raw }))
  return code
}

/**
 * 调一次 /convert 接口，返回换算结果与汇率。
 * 错误全部转成面向用户的双语错误：网络失败 / HTTP 非 2xx / 业务失败。
 */
async function requestConvert(
  url: string,
  t: Translate,
): Promise<{ result: number; rate: number | null }> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch {
    throw new Error(t('exchangeRate.error.networkError'))
  }
  if (!response.ok) {
    throw new Error(t('exchangeRate.error.httpError', { status: response.status }))
  }
  let data: ConvertResponse
  try {
    data = (await response.json()) as ConvertResponse
  } catch {
    // 响应体不是合法 JSON：转成双语错误，不直接抛原生 SyntaxError
    throw new Error(t('exchangeRate.error.badResponse'))
  }
  if (data.success !== true || typeof data.result !== 'number' || !Number.isFinite(data.result)) {
    const info = typeof data.error?.info === 'string' ? data.error.info : 'unknown'
    throw new Error(
      t('exchangeRate.error.apiError', { info: info.slice(0, ERROR_INFO_MAX_LENGTH) }),
    )
  }
  const rate =
    typeof data.info?.rate === 'number' && Number.isFinite(data.info.rate) ? data.info.rate : null
  return { result: data.result, rate }
}

/**
 * T2 异步入口（只在点「运行」时发起，避免误触付费接口）。
 * 空输入返回空串；未填 Key 时明确提示用户填写；同币种直接返回不调接口。
 */
export async function transform(
  input: ExchangeRateInput,
  options: ExchangeRateOptions,
  t: Translate,
): Promise<string> {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)

  const text = parsedInput.text.trim()
  if (text === '') return ''

  const apiKey = parsedInput.apiKey.trim()
  if (apiKey === '') throw new Error(t('exchangeRate.error.missingApiKey'))

  const amount = parseAmount(text, t)
  const from = parseCurrency(parsedOptions.from, t)
  const to = parseCurrency(parsedOptions.to, t)

  if (from === to) return `${fmt(amount)} ${from} = ${fmt(amount)} ${to}`

  const { result, rate } = await requestConvert(buildUrl(apiKey, from, to, text), t)
  // 汇率优先用接口返回的 info.rate；缺失时按 result/amount 反推（金额为 0 时无意义则省略）
  const displayRate = rate ?? (amount === 0 ? null : result / amount)
  const lines = [`${fmt(amount)} ${from} = ${fmt(result)} ${to}`]
  if (displayRate !== null) lines.push(`1 ${from} = ${fmt(displayRate)} ${to}`)
  return lines.join('\n')
}
