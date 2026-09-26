import type { WebhookTestInput, WebhookTestOptions } from './schema'

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
  let res: Response
  try {
    res = await fetch(url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  } catch (error) {
    throw new Error(
      '发送失败：' +
        (error instanceof Error ? error.message : String(error)) +
        '（常见：目标未允许 CORS、地址不通、Webhook 服务不可达）',
      { cause: error },
    )
  }
  const text = await res.text()
  return [
    `POST ${url.trim()}`,
    `状态：${res.status} ${res.statusText}`,
    '响应体：',
    text === '' ? '(空响应)' : text,
  ].join('\n')
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
