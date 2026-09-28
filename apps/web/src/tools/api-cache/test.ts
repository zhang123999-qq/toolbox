/**
 * api-cache（#761）utils 单测：HTTP 缓存头解析与新鲜度决策。
 */
import { describe, expect, it } from 'vitest'
import { evaluateCache, parseCacheControl, parseCacheInput } from './utils'

describe('parseCacheControl', () => {
  it('解析 max-age 与指令', () => {
    const d = parseCacheControl('public, max-age=3600, must-revalidate')
    expect(d.maxAge).toBe(3600)
    expect(d.isPublic).toBe(true)
    expect(d.mustRevalidate).toBe(true)
    expect(d.noStore).toBe(false)
  })
  it('解析 s-maxage 优先', () => {
    const d = parseCacheControl('s-maxage=600, max-age=3600')
    expect(d.sMaxAge).toBe(600)
    expect(d.maxAge).toBe(3600)
  })
  it('解析全部布尔指令', () => {
    const d = parseCacheControl('no-store, no-cache, no-transform, private, immutable')
    expect(d.noStore).toBe(true)
    expect(d.noCache).toBe(true)
    expect(d.noTransform).toBe(true)
    expect(d.isPrivate).toBe(true)
    expect(d.immutable).toBe(true)
  })
  it('空值秒数被忽略', () => {
    const d = parseCacheControl('max-age=')
    expect(d.maxAge).toBeUndefined()
  })
  it('非法秒数被忽略', () => {
    const d = parseCacheControl('max-age=abc, max-age=-5')
    expect(d.maxAge).toBeUndefined()
  })
  it('未知指令忽略', () => {
    const d = parseCacheControl('stale-while-revalidate=30')
    expect(d.maxAge).toBeUndefined()
  })
  it('大小写与空格容忍', () => {
    const d = parseCacheControl('  Max-Age = 60 ')
    expect(d.maxAge).toBe(60)
  })
  it('空头解析为空指令', () => {
    const d = parseCacheControl('')
    expect(d.noStore).toBe(false)
    expect(d.maxAge).toBeUndefined()
  })
})

describe('evaluateCache', () => {
  it('no-store 禁止缓存', () => {
    const r = evaluateCache({ cacheControl: 'no-store' })
    expect(r.decision).toBe('no-store')
    expect(r.ttlMs).toBe(0)
    expect(r.reason).toContain('no-store')
  })
  it('max-age 未过期为新鲜', () => {
    const r = evaluateCache({ cacheControl: 'max-age=3600', age: 100 })
    expect(r.decision).toBe('fresh')
    expect(r.ttlMs).toBe(3500000)
  })
  it('s-maxage 优先于 max-age', () => {
    const r = evaluateCache({ cacheControl: 's-maxage=60, max-age=3600' })
    expect(r.decision).toBe('fresh')
    expect(r.ttlMs).toBe(60000)
  })
  it('max-age 过期且无 etag', () => {
    const r = evaluateCache({ cacheControl: 'max-age=60', age: 120 })
    expect(r.decision).toBe('stale-revalidate')
    expect(r.reason).toContain('max-age 已过期')
  })
  it('max-age 过期且有 etag 提示条件请求', () => {
    const r = evaluateCache({ cacheControl: 'max-age=60', age: 120, etag: '"x"' })
    expect(r.reason).toContain('ETag')
  })
  it('must-revalidate 过期提示校验', () => {
    const r = evaluateCache({ cacheControl: 'max-age=60, must-revalidate', age: 120 })
    expect(r.reason).toContain('must-revalidate')
  })
  it('Expires 未到期为新鲜', () => {
    const r = evaluateCache({
      expires: 'Wed, 01 Jan 2031 00:00:00 GMT',
      now: Date.parse('Wed, 01 Jan 2030 00:00:00 GMT'),
    })
    expect(r.decision).toBe('fresh')
    expect(r.reason).toContain('Expires 未到期')
  })
  it('Expires 已过期', () => {
    const r = evaluateCache({
      expires: 'Wed, 01 Jan 2020 00:00:00 GMT',
      now: Date.parse('Wed, 01 Jan 2030 00:00:00 GMT'),
    })
    expect(r.decision).toBe('stale-revalidate')
    expect(r.reason).toContain('Expires 已过期')
  })
  it('Expires 非法回退到条件请求判断', () => {
    const r = evaluateCache({ expires: 'not-a-date', etag: '"x"' })
    expect(r.decision).toBe('stale-revalidate')
  })
  it('no-cache 走条件请求', () => {
    const r = evaluateCache({ cacheControl: 'no-cache' })
    expect(r.decision).toBe('stale-revalidate')
    expect(r.reason).toContain('条件请求')
  })
  it('仅有 etag 走条件请求', () => {
    const r = evaluateCache({ etag: '"x"' })
    expect(r.decision).toBe('stale-revalidate')
  })
  it('无任何指令无法判断', () => {
    const r = evaluateCache({})
    expect(r.decision).toBe('stale-revalidate')
    expect(r.reason).toContain('无缓存指令')
  })
})

describe('parseCacheInput', () => {
  it('合法 JSON 解析', () => {
    const o = parseCacheInput('{"cacheControl":"max-age=60","age":10}')
    expect(o.cacheControl).toBe('max-age=60')
    expect(o.age).toBe(10)
  })
  it('非字符串字段被忽略', () => {
    const o = parseCacheInput('{"cacheControl":42,"age":"x"}')
    expect(o.cacheControl).toBeUndefined()
    expect(o.age).toBeUndefined()
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseCacheInput('{')).toThrow('输入不是合法 JSON')
  })
  it('非对象抛错', () => {
    expect(() => parseCacheInput('42')).toThrow('输入必须是 JSON 对象')
  })
})
