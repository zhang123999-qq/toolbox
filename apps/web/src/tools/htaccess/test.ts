import { describe, expect, it } from 'vitest'
import type { HtaccessOptions } from './schema'
import { transform } from './utils'

function opts(over: Partial<HtaccessOptions>): HtaccessOptions {
  return { redirects: '', rewrites: false, cache: false, hotlink: false, deny: false, ...over }
}

describe('htaccess / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts({}))).toBe('')
  })

  it('重定向每行生成 Redirect 301', () => {
    const out = transform(
      { text: 'x' },
      opts({ redirects: '/old https://example.com/new\n/old2 https://example.com/n2' }),
    )
    expect(out).toContain('Redirect 301 /old https://example.com/new')
    expect(out).toContain('Redirect 301 /old2 https://example.com/n2')
  })

  it('重定向格式错误抛中文错', () => {
    expect(() => transform({ text: 'x' }, opts({ redirects: 'justone' }))).toThrow(/旧路径 新URL/)
  })

  it('rewrites 输出 RewriteEngine', () => {
    expect(transform({ text: 'x' }, opts({ rewrites: true }))).toContain('RewriteEngine On')
  })

  it('cache 输出 ExpiresActive', () => {
    expect(transform({ text: 'x' }, opts({ cache: true }))).toContain('ExpiresActive On')
  })

  it('hotlink 输出 403 规则', () => {
    expect(transform({ text: 'x' }, opts({ hotlink: true }))).toContain('[F]')
  })

  it('deny 输出 FilesMatch', () => {
    expect(transform({ text: 'x' }, opts({ deny: true }))).toContain('Require all denied')
  })

  it('什么都不选时报错', () => {
    expect(() => transform({ text: 'x' }, opts({}))).toThrow(/至少/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, opts({ cache: true }))).toThrow(/上限/)
  })
})
