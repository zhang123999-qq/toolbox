/**
 * edge-cache（#816）utils 单测：Cache-Control 生成与解析。
 */
import { describe, expect, it } from 'vitest'
import {
  buildCacheHeaders,
  describeParsed,
  EXAMPLE_CACHE_HEADER,
  noCacheHeaders,
  parseCacheControl,
} from './utils'

describe('buildCacheHeaders', () => {
  it('完整拼装', () => {
    expect(
      buildCacheHeaders({
        maxAge: 3600,
        sMaxAge: 86400,
        staleWhileRevalidate: 60,
        immutable: true,
      }),
    ).toBe('max-age=3600, s-maxage=86400, stale-while-revalidate=60, immutable')
  })
  it('no-store 独占', () => {
    expect(buildCacheHeaders({ noStore: true, maxAge: 60 })).toBe('no-store')
  })
  it('no-cache 与 must-revalidate', () => {
    expect(buildCacheHeaders({ noCache: true, mustRevalidate: true })).toBe(
      'no-cache, must-revalidate',
    )
  })
  it('空参数返回空字符串', () => {
    expect(buildCacheHeaders({})).toBe('')
  })
  it('0 值合法', () => {
    expect(buildCacheHeaders({ maxAge: 0 })).toBe('max-age=0')
  })
  it('负值抛错', () => {
    expect(() => buildCacheHeaders({ maxAge: -1 })).toThrow('max-age 须为非负整数')
    expect(() => buildCacheHeaders({ sMaxAge: -5 })).toThrow('s-maxage 须为非负整数')
    expect(() => buildCacheHeaders({ staleWhileRevalidate: -1 })).toThrow(
      'stale-while-revalidate 须为非负整数',
    )
  })
  it('非整数抛错', () => {
    expect(() => buildCacheHeaders({ maxAge: 1.5 })).toThrow('max-age 须为非负整数')
  })
})

describe('noCacheHeaders', () => {
  it('返回禁止缓存组合', () => {
    expect(noCacheHeaders()).toBe('no-store, no-cache, must-revalidate')
  })
})

describe('parseCacheControl', () => {
  it('解析示例头', () => {
    const parsed = parseCacheControl(EXAMPLE_CACHE_HEADER)
    expect(parsed).toEqual({
      maxAge: 3600,
      sMaxAge: 86400,
      staleWhileRevalidate: 60,
      immutable: false,
      noStore: false,
      noCache: false,
      mustRevalidate: false,
    })
  })
  it('解析开关指令', () => {
    const parsed = parseCacheControl('no-store, no-cache, immutable, must-revalidate')
    expect(parsed.noStore).toBe(true)
    expect(parsed.noCache).toBe(true)
    expect(parsed.immutable).toBe(true)
    expect(parsed.mustRevalidate).toBe(true)
  })
  it('未知指令被忽略', () => {
    const parsed = parseCacheControl('public, max-age=10, custom-x=1')
    expect(parsed.maxAge).toBe(10)
    expect(parsed.noStore).toBe(false)
  })
  it('大小写不敏感，空片段跳过', () => {
    const parsed = parseCacheControl('MAX-AGE=30,, No-Cache')
    expect(parsed.maxAge).toBe(30)
    expect(parsed.noCache).toBe(true)
  })
  it('带引号的值被接受', () => {
    expect(parseCacheControl('max-age="60"').maxAge).toBe(60)
  })
  it('非法指令值抛错', () => {
    expect(() => parseCacheControl('max-age=abc')).toThrow('指令值非法：max-age=abc')
    expect(() => parseCacheControl('s-maxage=-5')).toThrow('指令值非法')
  })
  it('round-trip', () => {
    const header = buildCacheHeaders({ maxAge: 100, sMaxAge: 200, immutable: true })
    const parsed = parseCacheControl(header)
    expect(parsed.maxAge).toBe(100)
    expect(parsed.sMaxAge).toBe(200)
    expect(parsed.immutable).toBe(true)
  })
})

describe('describeParsed', () => {
  it('完整描述', () => {
    const desc = describeParsed({
      maxAge: 3600,
      sMaxAge: 86400,
      staleWhileRevalidate: 60,
      immutable: true,
      noStore: false,
      noCache: false,
      mustRevalidate: true,
    })
    expect(desc).toContain('浏览器缓存 3600 秒')
    expect(desc).toContain('CDN 缓存 86400 秒')
    expect(desc).toContain('过期后异步更新 60 秒')
    expect(desc).toContain('内容不可变')
    expect(desc).toContain('过期必须重新验证')
  })
  it('no-store 描述', () => {
    const desc = describeParsed(parseCacheControl('no-store'))
    expect(desc).toContain('禁止存储')
  })
  it('no-cache 描述', () => {
    expect(describeParsed(parseCacheControl('no-cache'))).toContain('每次重新验证')
  })
  it('空指令描述', () => {
    expect(describeParsed(parseCacheControl('public'))).toBe('无有效缓存指令')
  })
})
