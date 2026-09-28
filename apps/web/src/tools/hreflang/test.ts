import { describe, expect, it } from 'vitest'
import { buildHreflangTags, escapeHtmlAttr, isHttpUrl, isLangCode, LANGUAGES } from './utils'
import type { HreflangEntry } from './utils'

describe('hreflang · isLangCode', () => {
  it('两位小写与「语言-地区」通过', () => {
    expect(isLangCode('en')).toBe(true)
    expect(isLangCode('zh-CN')).toBe(true)
    expect(isLangCode('pt-BR')).toBe(true)
  })

  it('大小写/位数不对不通过', () => {
    expect(isLangCode('EN')).toBe(false)
    expect(isLangCode('zh-cn')).toBe(false)
    expect(isLangCode('eng')).toBe(false)
    expect(isLangCode('e')).toBe(false)
    expect(isLangCode('zh-CNN')).toBe(false)
    expect(isLangCode('')).toBe(false)
  })

  it('LANGUAGES 列表全部符合格式', () => {
    for (const lang of LANGUAGES) {
      expect(isLangCode(lang)).toBe(true)
    }
  })
})

describe('hreflang · isHttpUrl', () => {
  it('http(s) 通过，ftp 与相对路径不通过', () => {
    expect(isHttpUrl('https://example.com/en/')).toBe(true)
    expect(isHttpUrl('ftp://example.com/')).toBe(false)
    expect(isHttpUrl('/en/')).toBe(false)
  })
})

describe('hreflang · escapeHtmlAttr', () => {
  it('转义属性特殊字符', () => {
    expect(escapeHtmlAttr('a&b"c')).toBe('a&amp;b&quot;c')
  })
})

describe('hreflang · buildHreflangTags', () => {
  it('多条按顺序输出标签组', () => {
    const out = buildHreflangTags([
      { lang: 'en', url: 'https://example.com/en/' },
      { lang: 'zh-CN', url: 'https://example.com/zh/' },
    ])
    expect(out).toBe(
      '<link rel="alternate" hreflang="en" href="https://example.com/en/">\n' +
        '<link rel="alternate" hreflang="zh-CN" href="https://example.com/zh/">\n',
    )
  })

  it('空列表抛中文错', () => {
    expect(() => buildHreflangTags([])).toThrow('至少需要 1 条语言-地区对')
  })

  it('语言代码为空抛错带序号', () => {
    expect(() => buildHreflangTags([{ lang: '  ', url: 'https://example.com/' }])).toThrow(
      '第 1 条：语言代码不能为空',
    )
  })

  it('缺失字段视为空并抛中文错', () => {
    expect(() => buildHreflangTags([{} as unknown as HreflangEntry])).toThrow('第 1 条：语言代码不能为空')
    expect(() => buildHreflangTags([{ lang: 'en' } as unknown as HreflangEntry])).toThrow(
      '第 1 条：URL 不能为空',
    )
  })

  it('语言代码格式错误抛错带原文', () => {
    expect(() => buildHreflangTags([{ lang: 'english', url: 'https://example.com/' }])).toThrow(
      '第 1 条：语言代码「english」格式错误',
    )
  })

  it('URL 为空抛错', () => {
    expect(() => buildHreflangTags([{ lang: 'en', url: ' ' }])).toThrow('第 1 条：URL 不能为空')
  })

  it('URL 不合法抛错', () => {
    expect(() => buildHreflangTags([{ lang: 'en', url: 'not-a-url' }])).toThrow('第 1 条：URL 不合法')
  })

  it('错误序号指向第二条', () => {
    expect(() =>
      buildHreflangTags([
        { lang: 'en', url: 'https://example.com/en/' },
        { lang: 'eng', url: 'https://example.com/eng/' },
      ]),
    ).toThrow('第 2 条')
  })

  it('属性值特殊字符被转义', () => {
    const out = buildHreflangTags([{ lang: 'en', url: 'https://example.com/?a=1&b=2' }])
    expect(out).toContain('href="https://example.com/?a=1&amp;b=2"')
  })

  it('首尾空格被容忍', () => {
    const out = buildHreflangTags([{ lang: ' en ', url: '  https://example.com/en/ ' }])
    expect(out).toContain('hreflang="en"')
  })
})
