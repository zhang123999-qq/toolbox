import { describe, expect, it } from 'vitest'
import { UrlParseError, toParts, transform } from './utils'

describe('url-parser / transform', () => {
  it('拆解完整 URL 的各组成部分', () => {
    const output = JSON.parse(transform({ text: 'https://example.com:8080/a/b?x=1#top' }))
    expect(output.protocol).toBe('https:')
    expect(output.hostname).toBe('example.com')
    expect(output.port).toBe('8080')
    expect(output.pathname).toBe('/a/b')
    expect(output.hash).toBe('#top')
    expect(output.searchParams).toEqual({ x: '1' })
  })

  it('重复查询参数合并为数组', () => {
    const output = JSON.parse(transform({ text: 'https://a.test/?tag=x&tag=y' }))
    expect(output.searchParams).toEqual({ tag: ['x', 'y'] })
  })

  it('带用户信息时解析出 username / password', () => {
    const output = JSON.parse(transform({ text: 'https://u:p@a.test/' }))
    expect(output.username).toBe('u')
    expect(output.password).toBe('p')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' })).toBe('')
    expect(transform({ text: '   ' })).toBe('')
  })

  it('相对路径或无协议输入抛出 UrlParseError（异常）', () => {
    expect(() => transform({ text: 'example.com/a' })).toThrow(UrlParseError)
    expect(() => transform({ text: '/a/b' })).toThrow(UrlParseError)
  })
})

describe('url-parser / toParts', () => {
  it('origin 对非特殊协议返回 null 值之外的字符串', () => {
    const parts = toParts(new URL('https://a.test/x'))
    expect(parts.origin).toBe('https://a.test')
  })
})
