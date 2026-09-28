import { describe, expect, it } from 'vitest'
import { buildSitemapXml, escapeXml } from './utils'

describe('sitemap-generate · escapeXml', () => {
  it('转义 XML 特殊字符', () => {
    expect(escapeXml('a&b<c>d"e\'f')).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
  })

  it('普通字符串原样返回', () => {
    expect(escapeXml('https://example.com/')).toBe('https://example.com/')
  })
})

describe('sitemap-generate · buildSitemapXml', () => {
  it('生成标准 urlset 结构', () => {
    const out = buildSitemapXml(['https://example.com/', 'https://example.com/about'])
    expect(out).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(out).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(out).toContain('<loc>https://example.com/</loc>')
    expect(out).toContain('<loc>https://example.com/about</loc>')
    expect(out.endsWith('</urlset>\n')).toBe(true)
  })

  it('空行被忽略', () => {
    const out = buildSitemapXml(['', 'https://example.com/', '   '])
    expect(out.match(/<url>/g)).toHaveLength(1)
  })

  it('空列表抛中文错', () => {
    expect(() => buildSitemapXml([])).toThrow('请至少输入一个 URL')
    expect(() => buildSitemapXml(['  ', ''])).toThrow('请至少输入一个 URL')
  })

  it('非法 URL 抛中文错并带行号', () => {
    expect(() => buildSitemapXml(['https://example.com/', 'not a url'])).toThrow(
      '第 2 行 URL 不合法',
    )
  })

  it('非 http(s) 协议抛中文错', () => {
    expect(() => buildSitemapXml(['ftp://example.com/'])).toThrow(
      '第 1 行 URL 必须以 http:// 或 https:// 开头',
    )
  })

  it('URL 中的特殊字符被转义', () => {
    const out = buildSitemapXml(['https://example.com/?a=1&b=2'])
    expect(out).toContain('<loc>https://example.com/?a=1&amp;b=2</loc>')
  })

  it('可选三项全部输出', () => {
    const out = buildSitemapXml(['https://example.com/'], {
      changefreq: 'daily',
      priority: '0.8',
      lastmod: '2026-09-28',
    })
    expect(out).toContain('<changefreq>daily</changefreq>')
    expect(out).toContain('<priority>0.8</priority>')
    expect(out).toContain('<lastmod>2026-09-28</lastmod>')
  })

  it('不传选项时不输出可选元素', () => {
    const out = buildSitemapXml(['https://example.com/'])
    expect(out).not.toContain('<changefreq>')
    expect(out).not.toContain('<priority>')
    expect(out).not.toContain('<lastmod>')
  })

  it('changefreq 非法抛中文错', () => {
    expect(() => buildSitemapXml(['https://example.com/'], { changefreq: 'sometimes' })).toThrow(
      'Changefreq 取值非法',
    )
  })

  it('priority 越界或非数字抛中文错', () => {
    for (const p of ['1.5', '-0.1', 'abc', '']) {
      // '' 走"未传"分支不抛错，其余抛错
      if (p === '') {
        expect(() => buildSitemapXml(['https://example.com/'], { priority: p })).not.toThrow()
      } else {
        expect(() => buildSitemapXml(['https://example.com/'], { priority: p })).toThrow(
          'Priority 必须是 0.0～1.0 之间的数字',
        )
      }
    }
  })

  it('priority 边界 0 / 1 / 1.0 合法', () => {
    for (const p of ['0', '1', '1.0', '0.0']) {
      const out = buildSitemapXml(['https://example.com/'], { priority: p })
      expect(out).toContain(`<priority>${p}</priority>`)
    }
  })

  it('lastmod 格式错误抛中文错', () => {
    expect(() => buildSitemapXml(['https://example.com/'], { lastmod: '2026/09/28' })).toThrow(
      'Lastmod 日期格式不正确',
    )
  })

  it('lastmod 非法日期抛中文错', () => {
    expect(() => buildSitemapXml(['https://example.com/'], { lastmod: '2026-02-30' })).toThrow(
      'Lastmod 不是合法日期',
    )
  })

  it('http 协议的 URL 也合法', () => {
    const out = buildSitemapXml(['http://example.com/'])
    expect(out).toContain('<loc>http://example.com/</loc>')
  })
})
