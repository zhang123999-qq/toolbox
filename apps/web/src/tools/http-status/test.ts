import { describe, expect, it } from 'vitest'
import { lookup, transform } from './utils'

describe('http-status / lookup', () => {
  it('精确查 404', () => {
    const [hit] = lookup('404')
    expect(hit?.en).toBe('Not Found')
    expect(hit?.category).toBe('4xx 客户端错误')
  })

  it('精确查 200', () => {
    expect(lookup('200')[0]?.en).toBe('OK')
  })

  it('关键词 not 命中多条', () => {
    const res = lookup('not')
    expect(res.length).toBeGreaterThanOrEqual(2)
    expect(res.map((r) => r.en)).toContain('Not Found')
    expect(res.map((r) => r.en)).toContain('Not Modified')
  })

  it('中文关键词「限流」命中 429', () => {
    expect(lookup('限流').map((r) => r.code)).toContain(429)
  })

  it('未知码号返回空', () => {
    expect(lookup('999')).toEqual([])
  })
})

describe('http-status / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('码号输出单行含义', () => {
    expect(transform({ text: '404' }, {})).toBe('404 Not Found（资源不存在）— 4xx 客户端错误')
  })

  it('关键词输出多条并 capped', () => {
    const out = transform({ text: '错误' }, {})
    expect(out).toContain('条匹配')
  })

  it('未找到抛错', () => {
    expect(() => transform({ text: '999' }, {})).toThrow(/未找到/)
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
