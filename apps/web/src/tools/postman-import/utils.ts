/**
 * postman-import（#751）纯函数：Postman Collection v2.1 解析、请求提取、断言任务导出。
 * 纯前端，无网络请求。
 */

/** 提取错误信息（保留非 Error 兜底） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export interface ImportedRequest {
  name: string
  method: string
  url: string
  headers: Record<string, string>
  query: Record<string, string>
  body: string
}

export interface ParseResult {
  collectionName: string
  requests: ImportedRequest[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 解析 Collection URL（string | {raw, host, path} 联合类型） */
export function resolveCollectionUrl(u: unknown): string {
  if (typeof u === 'string') {
    if (u.trim() === '') throw new Error('请求缺少 URL')
    return u
  }
  if (!isRecord(u)) throw new Error('请求缺少 URL')
  if (typeof u.raw === 'string' && u.raw.trim() !== '') return u.raw
  const protocol = typeof u.protocol === 'string' ? u.protocol : 'https'
  const host = Array.isArray(u.host) ? u.host.join('.') : typeof u.host === 'string' ? u.host : ''
  if (host === '') throw new Error('URL 对象缺少 host')
  const path = Array.isArray(u.path) ? u.path.join('/') : typeof u.path === 'string' ? u.path : ''
  return `${protocol}://${host}${path !== '' ? '/' + path : ''}`
}

/** 提取查询参数（URL 字符串或 URL 对象的 query 数组） */
export function extractQuery(u: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof u === 'string') {
    const qi = u.indexOf('?')
    if (qi !== -1) {
      new URLSearchParams(u.slice(qi + 1)).forEach((v, k) => {
        out[k] = v
      })
    }
    return out
  }
  if (isRecord(u) && Array.isArray(u.query)) {
    for (const q of u.query) {
      if (!isRecord(q) || typeof q.key !== 'string' || q.disabled) continue
      out[q.key] = typeof q.value === 'string' ? q.value : ''
    }
  }
  return out
}

/** 提取请求头（数组或对象；跳过 disabled） */
export function extractHeaders(h: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (Array.isArray(h)) {
    for (const item of h) {
      if (!isRecord(item) || item.disabled) continue
      const key =
        typeof item.key === 'string' ? item.key : typeof item.name === 'string' ? item.name : ''
      if (key === '') continue
      out[key] = typeof item.value === 'string' ? item.value : ''
    }
    return out
  }
  if (isRecord(h)) {
    for (const [k, v] of Object.entries(h)) out[k] = String(v)
  }
  return out
}

/** 提取请求体：raw 直接取，urlencoded 转查询串；form-data/file 暂不支持 */
export function extractBody(b: unknown): string {
  if (b === undefined || b === null) return ''
  if (typeof b === 'string') return b
  if (!isRecord(b)) return ''
  if (b.mode === 'raw') return typeof b.raw === 'string' ? b.raw : ''
  if (b.mode === 'urlencoded' && Array.isArray(b.urlencoded)) {
    const params = new URLSearchParams()
    for (const p of b.urlencoded) {
      if (!isRecord(p) || typeof p.key !== 'string' || p.disabled) continue
      params.append(p.key, typeof p.value === 'string' ? p.value : '')
    }
    return params.toString()
  }
  if (b.mode === 'formdata' || b.mode === 'file') {
    throw new Error(`暂不支持 ${b.mode} 类型的请求体，可先在 Postman 中转为 raw`)
  }
  return ''
}

function extractRequest(item: Record<string, unknown>, fullName: string): ImportedRequest {
  const r = item.request
  if (typeof r === 'string') {
    return { name: fullName, method: 'GET', url: r, headers: {}, query: extractQuery(r), body: '' }
  }
  if (!isRecord(r)) throw new Error(`请求「${fullName}」缺少 request 对象`)
  const method =
    typeof r.method === 'string' && r.method.trim() !== '' ? r.method.trim().toUpperCase() : 'GET'
  return {
    name: fullName,
    method,
    url: resolveCollectionUrl(r.url),
    headers: extractHeaders(r.header),
    query: extractQuery(r.url),
    body: extractBody(r.body),
  }
}

function walkItems(items: unknown[], prefix: string, out: ImportedRequest[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue
    const name = typeof item.name === 'string' && item.name !== '' ? item.name : '未命名'
    const fullName = prefix === '' ? name : `${prefix} / ${name}`
    if (Array.isArray(item.item)) {
      walkItems(item.item, fullName, out)
    } else if (item.request !== undefined) {
      out.push(extractRequest(item, fullName))
    }
    // 既无 item 也无 request 的条目直接跳过
  }
}

/** 解析 Postman Collection v2.1 JSON；非法时抛中文错 */
export function parsePostmanCollection(text: string): ParseResult {
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('请粘贴 Postman Collection JSON')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    throw new Error('不是合法的 Postman Collection JSON：' + errorMessage(e), { cause: e })
  }
  if (!isRecord(parsed)) throw new Error('Collection 顶层必须是对象')
  const info = parsed.info
  if (
    !isRecord(info) ||
    typeof info.schema !== 'string' ||
    !info.schema.includes('collection/v2.1')
  ) {
    throw new Error('不是 Postman Collection v2.1（info.schema 不匹配）')
  }
  if (!Array.isArray(parsed.item)) throw new Error('Collection 缺少 item 数组')
  const requests: ImportedRequest[] = []
  walkItems(parsed.item, '', requests)
  const collectionName =
    typeof info.name === 'string' && info.name !== '' ? info.name : '未命名集合'
  return { collectionName, requests }
}

/** 转为 #748 http-assert 可用的断言任务 JSON */
export function toAssertTask(r: ImportedRequest): string {
  const headersText = Object.entries(r.headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return JSON.stringify(
    {
      url: r.url,
      method: r.method,
      headers: headersText,
      body: r.body,
      assertions: [
        { type: 'statusRange', min: 200, max: 299 },
        { type: 'timeLt', ms: 5000 },
      ],
    },
    null,
    2,
  )
}

/** 把解析结果格式化为文本摘要 */
export function formatRequestList(result: ParseResult): string {
  const lines = [`集合：${result.collectionName}，共 ${result.requests.length} 个请求`, '']
  result.requests.forEach((r, i) => {
    lines.push(`${i + 1}. [${r.method}] ${r.name} — ${r.url}`)
  })
  return lines.join('\n')
}

export const DEFAULT_COLLECTION_JSON = `{
  "info": {
    "name": "示例集合",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "用户",
      "item": [
        {
          "name": "获取用户",
          "request": {
            "method": "GET",
            "url": {
              "raw": "https://api.example.com/users/123?active=true",
              "protocol": "https",
              "host": ["api", "example", "com"],
              "path": ["users", "123"],
              "query": [{ "key": "active", "value": "true" }]
            },
            "header": [{ "key": "Accept", "value": "application/json" }]
          }
        }
      ]
    },
    {
      "name": "创建用户",
      "request": {
        "method": "POST",
        "url": "https://api.example.com/users",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\\"name\\": \\"Tom\\"}" }
      }
    }
  ]
}`
