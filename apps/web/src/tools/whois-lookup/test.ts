import { describe, expect, it } from 'vitest'
import type { WhoisLookupOptions } from './schema'
import { localInfo, transform } from './utils'

const NONE: WhoisLookupOptions = {}

describe('whois-lookup / localInfo', () => {
  it('剥掉 www 并识别注册域名', () => {
    const info = localInfo('www.example.com')
    expect(info.normalized).toBe('example.com')
    expect(info.registeredDomain).toBe('example.com')
    expect(info.tld).toBe('com')
  })

  it('处理二级后缀 .com.cn', () => {
    const info = localInfo('blog.example.com.cn')
    expect(info.tld).toBe('com.cn')
    expect(info.registeredDomain).toBe('example.com.cn')
  })

  it('查到 whois 服务器', () => {
    expect(localInfo('example.com').whoisServer).toBe('whois.verisign-grs.com')
    expect(localInfo('example.com.cn').whoisServer).toBe('whois.cnnic.cn')
  })

  it('非法域名报错', () => {
    expect(() => localInfo('')).toThrow(/请输入/)
    expect(() => localInfo('nodomain')).toThrow(/格式/)
  })
})

describe('whois-lookup / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '  ' }, NONE)).resolves.toBe('')
  })

  it('端到端输出本地信息（RDAP 可能失败但不报错）', async () => {
    const out = await transform({ text: 'example.com' }, NONE)
    expect(out).toContain('注册域名：example.com')
    expect(out).toContain('Whois 服务器：')
    expect(out).toContain('RDAP')
  })

  it('非法域名在发请求前抛错', async () => {
    await expect(transform({ text: 'bad' }, NONE)).rejects.toThrow(/格式/)
  })

  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, NONE)).rejects.toThrow(/上限/)
  })
})
