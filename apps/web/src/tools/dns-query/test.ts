import { describe, expect, it } from 'vitest'
import type { DnsQueryOptions } from './schema'
import { assertDomain, renderResponse, transform } from './utils'

const base: DnsQueryOptions = { type: 'A' }

describe('dns-query / assertDomain', () => {
  it('合法域名通过', () => {
    expect(() => assertDomain('example.com')).not.toThrow()
    expect(() => assertDomain('sub.example.com.cn')).not.toThrow()
  })
  it('空/含空白/格式错报错', () => {
    expect(() => assertDomain('')).toThrow(/请输入/)
    expect(() => assertDomain('exa mple.com')).toThrow(/空白/)
    expect(() => assertDomain('notadomain')).toThrow(/格式/)
  })
})

describe('dns-query / renderResponse', () => {
  it('渲染 Answer 数组', () => {
    const out = renderResponse({
      Status: 0,
      Answer: [
        { name: 'example.com.', type: 1, TTL: 300, data: '93.184.216.34' },
        { name: 'example.com.', type: 1, TTL: 300, data: '93.184.216.35' },
      ],
    })
    expect(out).toContain('NOERROR')
    expect(out).toContain('93.184.216.34')
    expect(out).toContain('A')
  })

  it('NXDOMAIN 提示域名不存在', () => {
    expect(renderResponse({ Status: 3 })).toContain('NXDOMAIN')
  })

  it('无 Answer 时提示无记录', () => {
    expect(renderResponse({ Status: 0 })).toContain('无记录')
  })
})

describe('dns-query / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '   ' }, base)).resolves.toBe('')
  })
  it('非法域名在发请求前抛错', async () => {
    await expect(transform({ text: 'nope' }, base)).rejects.toThrow(/格式/)
  })
  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, base)).rejects.toThrow(/上限/)
  })
})
