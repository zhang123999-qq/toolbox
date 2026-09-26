import type { HttpClientInput, HttpClientOptions } from './schema'

/** 把多行 `Key: Value` 解析成对象（纯函数） */
export function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    if (key !== '') out[key] = trimmed.slice(idx + 1).trim()
  }
  return out
}

/** 校验 URL */
export function assertUrl(url: string): void {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入请求 URL，如 https://api.example.com/health')
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('URL 必须以 http:// 或 https:// 开头')
}

/** 执行请求并格式化结果 */
export async function doRequest(
  url: string,
  input: HttpClientInput,
  options: HttpClientOptions,
): Promise<string> {
  const headers = parseHeaders(input.headers)
  const init: RequestInit = { method: options.method, headers }
  if (options.noCors) init.mode = 'no-cors'
  if (!['GET', 'HEAD'].includes(options.method) && input.body.trim() !== '') {
    init.body = input.body
  }

  let res: Response
  try {
    res = await fetch(url.trim(), init)
  } catch (error) {
    throw new Error(
      '请求失败：' +
        (error instanceof Error ? error.message : String(error)) +
        '（常见原因：目标未允许 CORS、地址不通、混合内容被拦）',
      { cause: error },
    )
  }

  if (options.noCors) {
    return [
      `已发送（no-cors 模式）：${options.method} ${url.trim()}`,
      '响应是不透明的（opaque）：浏览器不暴露状态码与响应体，这是 no-cors 的固有限制。',
      '要查看响应，请改用普通模式并确保目标服务器返回 CORS 头。',
    ].join('\n')
  }

  const lines: string[] = []
  lines.push(`${options.method} ${url.trim()}`)
  lines.push(`状态：${res.status} ${res.statusText}`)
  lines.push('响应头：')
  res.headers.forEach((value, key) => lines.push(`  ${key}: ${value}`))
  const text = await res.text()
  lines.push('')
  lines.push('响应体：')
  lines.push(text === '' ? '(空)' : text)
  return lines.join('\n')
}

export async function transform(
  input: HttpClientInput,
  options: HttpClientOptions,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000 || input.headers.length > 200000 || input.body.length > 200000) {
    throw new Error('输入超过 200,000 字符上限')
  }
  assertUrl(input.text)
  return doRequest(input.text, input, options)
}
