import { describe, expect, it } from 'vitest'
import { buildCanonicalTag, escapeHtmlAttr, isHttpUrl } from './utils'

describe('canonical · escapeHtmlAttr', () => {
  it('转义属性特殊字符', () => {
    expect(escapeHtmlAttr('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e')
  })
})

describe('canonical · isHttpUrl', () => {
  it('http 与 https 通过', () => {
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('https://example.com/a?b=1')).toBe(true)
  })

  it('首尾空格被容忍', () => {
    expect(isHttpUrl('  https://example.com  ')).toBe(true)
  })

  it('非 http(s) 协议不通过', () => {
    expect(isHttpUrl('ftp://example.com')).toBe(false)
  })

  it('相对路径与空字符串不通过', () => {
    expect(isHttpUrl('/path/to/page')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
  })
})

describe('canonical · buildCanonicalTag', () => {
  it('双 URL 合法时输出 canonical 标签', () => {
    expect(buildCanonicalTag('https://example.com/a', 'https://example.com/canonical')).toBe(
      '<link rel="canonical" href="https://example.com/canonical">\n',
    )
  })

  it('页面 URL 为空抛中文错', () => {
    expect(() => buildCanonicalTag('  ', 'https://example.com/c')).toThrow('页面 URL 不能为空')
  })

  it('页面 URL 不合法抛中文错', () => {
    expect(() => buildCanonicalTag('/relative', 'https://example.com/c')).toThrow('页面 URL 不合法')
  })

  it('规范 URL 为空抛中文错', () => {
    expect(() => buildCanonicalTag('https://example.com/a', '')).toThrow('规范 URL 不能为空')
  })

  it('规范 URL 不合法抛中文错', () => {
    expect(() => buildCanonicalTag('https://example.com/a', 'ftp://example.com/c')).toThrow(
      '规范 URL 不合法',
    )
  })

  it('规范 URL 中的特殊字符被转义', () => {
    const out = buildCanonicalTag('https://example.com/a', 'https://example.com/c?a=1&b=2')
    expect(out).toContain('href="https://example.com/c?a=1&amp;b=2"')
  })

  it('undefined 输入视为空并抛中文错', () => {
    expect(() =>
      buildCanonicalTag(undefined as unknown as string, 'https://example.com/c'),
    ).toThrow('页面 URL 不能为空')
    expect(() =>
      buildCanonicalTag('https://example.com/a', undefined as unknown as string),
    ).toThrow('规范 URL 不能为空')
  })

  it('输出换行结尾', () => {
    expect(buildCanonicalTag('https://example.com/a', 'https://example.com/c').endsWith('\n')).toBe(
      true,
    )
  })
})
