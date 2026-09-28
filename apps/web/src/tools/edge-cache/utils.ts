/**
 * edge-cache（#816）核心逻辑：Cache-Control 头的生成与解析。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export interface CacheControlOptions {
  maxAge?: number
  sMaxAge?: number
  staleWhileRevalidate?: number
  immutable?: boolean
  noStore?: boolean
  noCache?: boolean
  mustRevalidate?: boolean
}

function requireNonNegative(value: number | undefined, name: string): void {
  if (value === undefined) return
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} 须为非负整数`)
}

/** 拼装 Cache-Control 头；数值为负或非整数时中文抛错 */
export function buildCacheHeaders(options: CacheControlOptions): string {
  requireNonNegative(options.maxAge, 'max-age')
  requireNonNegative(options.sMaxAge, 's-maxage')
  requireNonNegative(options.staleWhileRevalidate, 'stale-while-revalidate')
  if (options.noStore === true) return 'no-store'
  const parts: string[] = []
  if (options.noCache === true) parts.push('no-cache')
  if (options.maxAge !== undefined) parts.push(`max-age=${options.maxAge}`)
  if (options.sMaxAge !== undefined) parts.push(`s-maxage=${options.sMaxAge}`)
  if (options.staleWhileRevalidate !== undefined)
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
  if (options.immutable === true) parts.push('immutable')
  if (options.mustRevalidate === true) parts.push('must-revalidate')
  return parts.join(', ')
}

/** 禁止缓存的常用组合 */
export function noCacheHeaders(): string {
  return 'no-store, no-cache, must-revalidate'
}

export interface ParsedCacheControl {
  maxAge?: number
  sMaxAge?: number
  staleWhileRevalidate?: number
  immutable: boolean
  noStore: boolean
  noCache: boolean
  mustRevalidate: boolean
}

/** 解析 Cache-Control 头；指令值非法时中文抛错，未知指令忽略 */
export function parseCacheControl(header: string): ParsedCacheControl {
  const result: ParsedCacheControl = {
    immutable: false,
    noStore: false,
    noCache: false,
    mustRevalidate: false,
  }
  const parts = header.split(',')
  for (const part of parts) {
    const token = part.trim().toLowerCase()
    if (token === '') continue
    const eq = token.indexOf('=')
    if (eq < 0) {
      switch (token) {
        case 'no-store':
          result.noStore = true
          break
        case 'no-cache':
          result.noCache = true
          break
        case 'immutable':
          result.immutable = true
          break
        case 'must-revalidate':
          result.mustRevalidate = true
          break
        default:
          break
      }
      continue
    }
    const key = token.slice(0, eq).trim()
    const raw = token
      .slice(eq + 1)
      .trim()
      .replace(/^"|"$/g, '')
    if (!/^\d+$/.test(raw)) throw new Error(`指令值非法：${part.trim()}`)
    const value = Number(raw)
    switch (key) {
      case 'max-age':
        result.maxAge = value
        break
      case 's-maxage':
        result.sMaxAge = value
        break
      case 'stale-while-revalidate':
        result.staleWhileRevalidate = value
        break
      default:
        break
    }
  }
  return result
}

/** 解析结果的人类可读摘要 */
export function describeParsed(parsed: ParsedCacheControl): string {
  const bits: string[] = []
  if (parsed.noStore) bits.push('禁止存储')
  if (parsed.noCache) bits.push('每次重新验证')
  if (parsed.maxAge !== undefined) bits.push(`浏览器缓存 ${parsed.maxAge} 秒`)
  if (parsed.sMaxAge !== undefined) bits.push(`CDN 缓存 ${parsed.sMaxAge} 秒`)
  if (parsed.staleWhileRevalidate !== undefined)
    bits.push(`过期后异步更新 ${parsed.staleWhileRevalidate} 秒`)
  if (parsed.immutable) bits.push('内容不可变')
  if (parsed.mustRevalidate) bits.push('过期必须重新验证')
  return bits.length > 0 ? bits.join('；') : '无有效缓存指令'
}

export const EXAMPLE_CACHE_HEADER =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=60'
