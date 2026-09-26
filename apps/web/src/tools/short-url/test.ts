import { describe, expect, it } from 'vitest'
import { buildDemo, fnv1a, shortCode, toBase62, transform } from './utils'

describe('short-url / fnv1a & base62', () => {
  it('fnv1a 确定性且非零', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'))
    expect(fnv1a('hello')).not.toBe(0)
    expect(fnv1a('world')).not.toBe(fnv1a('hello'))
  })

  it('toBase62 定长输出', () => {
    expect(toBase62(12345, 8)).toHaveLength(8)
  })

  it('shortCode 是 8 位 base62', () => {
    const code = shortCode('https://example.com/a')
    expect(code).toMatch(/^[0-9a-zA-Z]{8}$/)
    expect(code).toBe(shortCode('https://example.com/a'))
  })
})

describe('short-url / buildDemo', () => {
  it('输出短码 + 短链示例 + 两套方案', () => {
    const out = buildDemo('https://example.com/long', 'https://s.example.com')
    expect(out).toContain('短码：')
    expect(out).toContain('完整短链示例：https://s.example.com/')
    expect(out).toContain('Nginx')
    expect(out).toContain('Cloudflare Worker')
  })

  it('非 http(s) URL 报错', () => {
    expect(() => buildDemo('ftp://x', '')).toThrow(/请输入以 http/)
  })
})

describe('short-url / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { baseUrl: '' })).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'http://x'.repeat(400) }, { baseUrl: '' })).toThrow(/上限/)
  })

  it('合法 URL 生成方案', () => {
    expect(transform({ text: 'https://a.com/b' }, { baseUrl: '' })).toContain('短码：')
  })
})
