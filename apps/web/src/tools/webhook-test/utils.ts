import type { WebhookTestInput, WebhookTestOptions } from './schema'

/** 单次 Webhook 发送超时（AbortController 中断，见 sendWebhook） */
const REQUEST_TIMEOUT_MS = 30_000

/** 校验 webhook URL */
export function assertUrl(url: string): void {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入 Webhook 地址，如 https://hooks.example.com/xxx')
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('Webhook 地址必须以 http:// 或 https:// 开头')
}

/** 校验 payload 是合法 JSON（留空则发空对象） */
export function resolvePayload(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') return '{}'
  try {
    JSON.parse(trimmed)
  } catch (error) {
    throw new Error(
      '请求体不是合法 JSON：' + (error instanceof Error ? error.message : String(error)),
      { cause: error },
    )
  }
  return trimmed
}

/** 发送 POST JSON */
export async function sendWebhook(url: string, payload: string): Promise<string> {
  const body = resolvePayload(payload)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    let res: Response
    try {
      res = await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`发送失败：请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒）`, {
          cause: error,
        })
      }
      throw new Error(
        '发送失败：' +
          (error instanceof Error ? error.message : String(error)) +
          '（常见：目标未允许 CORS、地址不通、Webhook 服务不可达）',
        { cause: error },
      )
    }
    let text: string
    try {
      text = await res.text()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`发送失败：请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒）`, {
          cause: error,
        })
      }
      throw error
    }
    return [
      `POST ${url.trim()}`,
      `状态：${res.status} ${res.statusText}`,
      '响应体：',
      text === '' ? '(空响应)' : text,
    ].join('\n')
  } finally {
    clearTimeout(timer)
  }
}

export async function transform(
  input: WebhookTestInput,
  _options: WebhookTestOptions,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.payload.length > 200000) throw new Error('请求体超过 200,000 字符上限')
  assertUrl(input.text)
  return sendWebhook(input.text, input.payload)
}
