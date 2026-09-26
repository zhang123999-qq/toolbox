import type { PostmanToCodeInput, PostmanToCodeOptions } from './schema'

const MAX_INPUT = 200_000

interface PmHeader {
  key?: string
  value?: string
}
interface PmRequest {
  name?: string
  method?: string
  url?: string | { raw?: string }
  header?: PmHeader[]
  body?: { mode?: string; raw?: string }
}
interface PmItem {
  name?: string
  request?: PmRequest
  item?: PmItem[]
}

/** 从 Postman URL 字段取 raw 字符串 */
function resolveUrl(url: PmRequest['url']): string {
  if (typeof url === 'string') return url
  if (url && typeof url === 'object' && typeof url.raw === 'string') return url.raw
  return ''
}

/** 扁平化集合（含一层文件夹），取出所有请求 */
export function flattenRequests(root: unknown): PmRequest[] {
  if (typeof root !== 'object' || root === null) throw new Error('集合必须是 JSON 对象')
  const items = (root as { item?: PmItem[] })['item']
  if (!Array.isArray(items)) throw new Error('缺少 item 数组：这不是合法的 Postman Collection v2.1')

  const out: PmRequest[] = []
  const walk = (list: PmItem[]): void => {
    for (const entry of list) {
      if (Array.isArray(entry.item)) walk(entry.item)
      else if (entry.request) out.push(entry.request)
    }
  }
  walk(items)
  if (out.length === 0) throw new Error('集合里没有任何请求')
  return out
}

const q = (s: string): string => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

/** 为单个请求生成选定语言的代码片段 */
export function snippet(req: PmRequest, language: string): string {
  const method = (req.method ?? 'GET').toUpperCase()
  const url = resolveUrl(req.url)
  const headers = (req.header ?? []).filter((h) => h.key)
  const body = req.body?.mode === 'raw' ? (req.body.raw ?? '') : ''

  if (language === 'curl') {
    const parts = [`curl -X ${method} ${q(url)}`]
    for (const h of headers) parts.push(`  -H ${q(`${h.key}: ${h.value ?? ''}`)}`)
    if (body) parts.push(`  -d ${q(body)}`)
    return parts.join(' \\\n')
  }
  if (language === 'python') {
    const lines = [`resp = requests.${method.toLowerCase()}(${q(url)}`]
    if (headers.length)
      lines.push(
        `    headers={${headers.map((h) => `${q(h.key ?? '')}: ${q(h.value ?? '')}`).join(', ')}},`,
      )
    if (body) lines.push(`    data=${q(body)},`)
    lines.push(')')
    lines.push('print(resp.status_code, resp.text)')
    return lines.join('\n')
  }
  // fetch
  const lines = [`const res = await fetch(${q(url)}, { method: ${q(method)},`]
  if (headers.length) {
    lines.push('  headers: {')
    for (const h of headers) lines.push(`    ${q(h.key ?? '')}: ${q(h.value ?? '')},`)
    lines.push('  },')
  }
  if (body) lines.push(`  body: ${q(body)},`)
  lines.push('})')
  lines.push('console.log(res.status, await res.text())')
  return lines.join('\n')
}

export function transform(input: PostmanToCodeInput, options: PostmanToCodeOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  let doc: unknown
  try {
    doc = JSON.parse(input.text)
  } catch (error) {
    throw new Error(
      '不是合法的 JSON：' + (error instanceof Error ? error.message : String(error)),
      { cause: error },
    )
  }
  const requests = flattenRequests(doc)
  const blocks: string[] = []
  for (const req of requests) {
    const method = (req.method ?? 'GET').toUpperCase()
    blocks.push(`### ${method} ${resolveUrl(req.url) || '(无 URL)'}`)
    blocks.push(snippet(req, options.language))
    blocks.push('')
  }
  return blocks.join('\n').trim()
}
