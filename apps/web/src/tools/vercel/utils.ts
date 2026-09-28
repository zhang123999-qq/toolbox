/**
 * vercel（#814）核心逻辑：vercel.json 的校验、生成与回读。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export interface VercelRewrite {
  source: string
  destination: string
}

export interface VercelRedirect {
  source: string
  destination: string
  permanent: boolean
}

export interface VercelHeaderEntry {
  key: string
  value: string
}

export interface VercelHeaders {
  source: string
  headers: VercelHeaderEntry[]
}

export interface VercelConfig {
  rewrites: VercelRewrite[]
  redirects: VercelRedirect[]
  headers: VercelHeaders[]
}

function requireLeadingSlash(value: string, field: string): void {
  if (!value.startsWith('/')) throw new Error(`${field} 必须以 / 开头：${value}`)
}

/** 目标地址允许站内路径或 http(s) 外链 */
function requireValidDestination(value: string, field: string): void {
  if (value.startsWith('/')) return
  if (/^https?:\/\/[^/\s]+\//.test(value) || /^https?:\/\/[^/\s]+$/.test(value)) return
  throw new Error(`${field} 须以 / 开头或为合法 http(s) 地址：${value}`)
}

function validateRewrite(item: VercelRewrite, index: number): void {
  requireLeadingSlash(item.source, `rewrites[${index}].source`)
  requireValidDestination(item.destination, `rewrites[${index}].destination`)
}

function validateRedirect(item: VercelRedirect, index: number): void {
  requireLeadingSlash(item.source, `redirects[${index}].source`)
  requireValidDestination(item.destination, `redirects[${index}].destination`)
}

function validateHeaders(item: VercelHeaders, index: number): void {
  requireLeadingSlash(item.source, `headers[${index}].source`)
  for (let i = 0; i < item.headers.length; i++) {
    if (item.headers[i].key.trim() === '')
      throw new Error(`headers[${index}].headers[${i}].key 不能为空`)
  }
}

/** 校验并生成格式化 vercel.json 字符串；路径非法时中文抛错 */
export function buildVercelJson(config: VercelConfig): string {
  config.rewrites.forEach(validateRewrite)
  config.redirects.forEach(validateRedirect)
  config.headers.forEach(validateHeaders)
  const out: Record<string, unknown> = {}
  if (config.rewrites.length > 0) out['rewrites'] = config.rewrites
  if (config.redirects.length > 0) out['redirects'] = config.redirects
  if (config.headers.length > 0) out['headers'] = config.headers
  return JSON.stringify(out, null, 2)
}

function asArray(value: unknown, field: string): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`${field} 须为数组`)
  return value
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`${field} 须为字符串`)
  return value
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${field} 须为布尔值`)
  return value
}

function parseRewrite(item: unknown, index: number): VercelRewrite {
  if (typeof item !== 'object' || item === null) throw new Error(`rewrites[${index}] 须为对象`)
  const o = item as Record<string, unknown>
  const source = asString(o['source'], `rewrites[${index}].source`)
  const destination = asString(o['destination'], `rewrites[${index}].destination`)
  requireLeadingSlash(source, `rewrites[${index}].source`)
  requireValidDestination(destination, `rewrites[${index}].destination`)
  return { source, destination }
}

function parseRedirect(item: unknown, index: number): VercelRedirect {
  if (typeof item !== 'object' || item === null) throw new Error(`redirects[${index}] 须为对象`)
  const o = item as Record<string, unknown>
  const source = asString(o['source'], `redirects[${index}].source`)
  const destination = asString(o['destination'], `redirects[${index}].destination`)
  const permanent = o['permanent'] === undefined ? true : asBoolean(o['permanent'], `redirects[${index}].permanent`)
  requireLeadingSlash(source, `redirects[${index}].source`)
  requireValidDestination(destination, `redirects[${index}].destination`)
  return { source, destination, permanent }
}

function parseHeaders(item: unknown, index: number): VercelHeaders {
  if (typeof item !== 'object' || item === null) throw new Error(`headers[${index}] 须为对象`)
  const o = item as Record<string, unknown>
  const source = asString(o['source'], `headers[${index}].source`)
  requireLeadingSlash(source, `headers[${index}].source`)
  const entries = asArray(o['headers'], `headers[${index}].headers`)
  const headers = entries.map((entry, i) => {
    if (typeof entry !== 'object' || entry === null)
      throw new Error(`headers[${index}].headers[${i}] 须为对象`)
    const e = entry as Record<string, unknown>
    const key = asString(e['key'], `headers[${index}].headers[${i}].key`)
    const value = asString(e['value'], `headers[${index}].headers[${i}].value`)
    if (key.trim() === '') throw new Error(`headers[${index}].headers[${i}].key 不能为空`)
    return { key, value }
  })
  return { source, headers }
}

/** 回读校验 vercel.json 文本；JSON 非法或结构非法时中文抛错 */
export function parseVercelJson(text: string): VercelConfig {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败，请检查输入是否为合法 JSON')
  }
  if (typeof data !== 'object' || data === null) throw new Error('vercel.json 顶层须为对象')
  const o = data as Record<string, unknown>
  return {
    rewrites: asArray(o['rewrites'], 'rewrites').map(parseRewrite),
    redirects: asArray(o['redirects'], 'redirects').map(parseRedirect),
    headers: asArray(o['headers'], 'headers').map(parseHeaders),
  }
}

/** 配置摘要：各节条目数 */
export function summarizeConfig(config: VercelConfig): string {
  return `rewrites ${config.rewrites.length} 条，redirects ${config.redirects.length} 条，headers ${config.headers.length} 条`
}

export const EXAMPLE_VERCEL_JSON = JSON.stringify(
  {
    rewrites: [{ source: '/api/:path*', destination: 'https://api.example.com/:path*' }],
    redirects: [{ source: '/old', destination: '/new', permanent: true }],
    headers: [
      { source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
    ],
  },
  null,
  2,
)
