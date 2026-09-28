/**
 * api-cache（#761）纯函数：HTTP 缓存头解析与新鲜度决策。
 * A 级工具：纯前端本地计算，无网络、无第三方 API。
 */

export interface CacheDirectives {
  maxAge?: number
  sMaxAge?: number
  noStore: boolean
  noCache: boolean
  mustRevalidate: boolean
  noTransform: boolean
  isPublic: boolean
  isPrivate: boolean
  immutable: boolean
}

function emptyDirectives(): CacheDirectives {
  return {
    noStore: false,
    noCache: false,
    mustRevalidate: false,
    noTransform: false,
    isPublic: false,
    isPrivate: false,
    immutable: false,
  }
}

function parseSeconds(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

/** 解析 Cache-Control 头 */
export function parseCacheControl(header: string): CacheDirectives {
  const d = emptyDirectives()
  for (const part of header.split(',')) {
    const eq = part.indexOf('=')
    const key = (eq === -1 ? part : part.slice(0, eq)).trim().toLowerCase()
    const val = eq === -1 ? undefined : part.slice(eq + 1).trim()
    switch (key) {
      case 'max-age':
        d.maxAge = parseSeconds(val)
        break
      case 's-maxage':
        d.sMaxAge = parseSeconds(val)
        break
      case 'no-store':
        d.noStore = true
        break
      case 'no-cache':
        d.noCache = true
        break
      case 'must-revalidate':
        d.mustRevalidate = true
        break
      case 'no-transform':
        d.noTransform = true
        break
      case 'public':
        d.isPublic = true
        break
      case 'private':
        d.isPrivate = true
        break
      case 'immutable':
        d.immutable = true
        break
      default:
        break
    }
  }
  return d
}

export interface CacheInput {
  cacheControl?: string
  etag?: string
  expires?: string
  age?: number
  /** 当前时间戳毫秒（测试可注入；缺省 Date.now()） */
  now?: number
}

export type CacheDecision = 'fresh' | 'stale-revalidate' | 'no-store'

export const DECISION_TEXT: Record<CacheDecision, string> = {
  fresh: '新鲜（可直接用缓存）',
  'stale-revalidate': '过期（需条件请求校验）',
  'no-store': '禁止缓存',
}

export interface CacheResult {
  decision: CacheDecision
  ttlMs: number
  reason: string
  directives: CacheDirectives
}

function stale(input: CacheInput, directives: CacheDirectives, why: string): CacheResult {
  let hint = ''
  if (input.etag) hint = '，可用 ETag 发起条件请求'
  else if (directives.mustRevalidate) hint = '，must-revalidate 要求先向源站校验'
  return { decision: 'stale-revalidate', ttlMs: 0, reason: why + hint, directives }
}

/** 缓存新鲜度决策 */
export function evaluateCache(input: CacheInput): CacheResult {
  const now = input.now ?? Date.now()
  const directives = parseCacheControl(input.cacheControl ?? '')
  if (directives.noStore) {
    return { decision: 'no-store', ttlMs: 0, reason: 'no-store：响应禁止写入任何缓存', directives }
  }
  const ageSec = input.age ?? 0
  const maxAgeSec = directives.sMaxAge ?? directives.maxAge
  if (maxAgeSec !== undefined) {
    const ttlMs = maxAgeSec * 1000 - ageSec * 1000
    if (ttlMs > 0) {
      return {
        decision: 'fresh',
        ttlMs,
        reason: 'max-age 剩余 ' + Math.round(ttlMs / 1000) + ' 秒',
        directives,
      }
    }
    return stale(input, directives, 'max-age 已过期')
  }
  if (input.expires) {
    const expMs = Date.parse(input.expires)
    if (!Number.isNaN(expMs)) {
      const ttlMs = expMs - now
      if (ttlMs > 0) {
        return { decision: 'fresh', ttlMs, reason: 'Expires 未到期', directives }
      }
      return stale(input, directives, 'Expires 已过期')
    }
  }
  if (directives.noCache || input.etag) {
    return stale(input, directives, '无 max-age，新鲜度只能靠条件请求确认')
  }
  return {
    decision: 'stale-revalidate',
    ttlMs: 0,
    reason: '无缓存指令，无法判断新鲜度，建议先发条件请求',
    directives,
  }
}

/** 解析组件输入 JSON（非法抛中文错） */
export function parseCacheInput(json: string): CacheInput {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('输入必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  return {
    cacheControl: typeof o.cacheControl === 'string' ? o.cacheControl : undefined,
    etag: typeof o.etag === 'string' ? o.etag : undefined,
    expires: typeof o.expires === 'string' ? o.expires : undefined,
    age: typeof o.age === 'number' ? o.age : undefined,
  }
}

/** 示例输入 */
export const EXAMPLE_INPUT = {
  cacheControl: 'public, max-age=3600, must-revalidate',
  etag: '"abc123"',
  expires: '',
  age: 0,
}
