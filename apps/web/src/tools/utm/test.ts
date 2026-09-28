import { describe, expect, it } from 'vitest'
import { buildUtmUrl } from './utils'

describe('utm · utils', () => {
  it('buildUtmUrl 拼接必填三参数', () => {
    const u = buildUtmUrl('https://example.com/landing', {
      source: 'google',
      medium: 'cpc',
      campaign: 'spring_sale',
    })
    expect(u).toContain('utm_source=google')
    expect(u).toContain('utm_medium=cpc')
    expect(u).toContain('utm_campaign=spring_sale')
  })

  it('buildUtmUrl 保留基 URL 原有参数并追加可选参数', () => {
    const u = buildUtmUrl('https://example.com/?a=1', {
      source: 's',
      medium: 'm',
      campaign: 'c',
      term: 'kw',
      content: 'v2',
    })
    expect(u).toContain('a=1')
    expect(u).toContain('utm_term=kw')
    expect(u).toContain('utm_content=v2')
  })

  it('buildUtmUrl 参数值自动编码', () => {
    const u = buildUtmUrl('https://example.com', {
      source: '微信 公众号',
      medium: 'm',
      campaign: 'c',
    })
    expect(u).not.toContain('微信 公众号')
    expect(u).toContain('utm_source=')
  })

  it('buildUtmUrl http 与 https 均可', () => {
    for (const base of ['http://example.com', 'https://example.com']) {
      const u = buildUtmUrl(base, { source: 's', medium: 'm', campaign: 'c' })
      expect(u).toContain('utm_source=s')
    }
  })

  it('buildUtmUrl 基 URL 为空抛中文错', () => {
    expect(() => buildUtmUrl('   ', { source: 's', medium: 'm', campaign: 'c' })).toThrow(
      '基 URL 不能为空',
    )
  })

  it('buildUtmUrl 非法基 URL 抛中文错', () => {
    expect(() => buildUtmUrl('not a url', { source: 's', medium: 'm', campaign: 'c' })).toThrow(
      '基 URL 不合法',
    )
  })

  it('buildUtmUrl 非 http(s) 协议抛中文错', () => {
    expect(() => buildUtmUrl('ftp://example.com', { source: 's', medium: 'm', campaign: 'c' })).toThrow(
      '必须以 http:// 或 https:// 开头',
    )
  })

  it('buildUtmUrl 必填参数为空逐个抛中文错', () => {
    const base = 'https://example.com'
    expect(() => buildUtmUrl(base, { source: ' ', medium: 'm', campaign: 'c' })).toThrow(
      'utm_source 不能为空',
    )
    expect(() => buildUtmUrl(base, { source: 's', medium: '', campaign: 'c' })).toThrow(
      'utm_medium 不能为空',
    )
    expect(() => buildUtmUrl(base, { source: 's', medium: 'm', campaign: '' })).toThrow(
      'utm_campaign 不能为空',
    )
  })

  it('buildUtmUrl 不传可选参数时不拼接', () => {
    const u = buildUtmUrl('https://example.com', { source: 's', medium: 'm', campaign: 'c' })
    expect(u).not.toContain('utm_term')
    expect(u).not.toContain('utm_content')
  })

  it('buildUtmUrl 空字符串可选参数视同未传', () => {
    const u = buildUtmUrl('https://example.com', {
      source: 's',
      medium: 'm',
      campaign: 'c',
      term: '  ',
      content: '',
    })
    expect(u).not.toContain('utm_term')
    expect(u).not.toContain('utm_content')
  })
})
