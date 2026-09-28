/**
 * sitemap-check 单元测试
 */
import { describe, expect, it } from 'vitest'
import {
  checkSitemap,
  isHttpUrl,
  isValidSitemapDate,
  parseSitemap,
  renderReport,
  SitemapError,
} from './utils'

const VALID = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-09-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-09-01T10:00:00+08:00</lastmod>
  </url>
</urlset>`

describe('parseSitemap', () => {
  it('空输入抛中文错', () => {
    expect(() => parseSitemap('   ')).toThrowError(SitemapError)
    expect(() => parseSitemap('   ')).toThrowError('请输入 sitemap XML 内容')
  })

  it('解析 urlset 条目及可选字段', () => {
    const { isIndex, entries } = parseSitemap(VALID)
    expect(isIndex).toBe(false)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      loc: 'https://example.com/',
      lastmod: '2026-09-01',
      changefreq: 'daily',
      priority: '1.0',
    })
    expect(entries[1].changefreq).toBeUndefined()
  })

  it('解析 sitemap 索引文件', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/s1.xml</loc><lastmod>2026-09-01</lastmod></sitemap>
</sitemapindex>`
    const { isIndex, entries } = parseSitemap(xml)
    expect(isIndex).toBe(true)
    expect(entries).toHaveLength(1)
    expect(entries[0].loc).toBe('https://example.com/s1.xml')
  })

  it('空标签视为缺失', () => {
    const { entries } = parseSitemap('<urlset><url><loc></loc></url></urlset>')
    expect(entries[0].loc).toBe('')
  })
})

describe('isHttpUrl', () => {
  it('http/https 通过', () => {
    expect(isHttpUrl('http://example.com/a')).toBe(true)
    expect(isHttpUrl('https://example.com/a')).toBe(true)
  })

  it('非 http(s) 与非法字符串不通过', () => {
    expect(isHttpUrl('ftp://example.com/a')).toBe(false)
    expect(isHttpUrl('/relative/path')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
  })
})

describe('isValidSitemapDate', () => {
  it('合法日期通过', () => {
    expect(isValidSitemapDate('2026-09-28')).toBe(true)
    expect(isValidSitemapDate('2026-09-28T10:00:00+08:00')).toBe(true)
    expect(isValidSitemapDate('2026-09-28T10:00Z')).toBe(true)
  })

  it('非法格式与不存在的日期不通过', () => {
    expect(isValidSitemapDate('2026/09/28')).toBe(false)
    expect(isValidSitemapDate('昨天')).toBe(false)
    expect(isValidSitemapDate('2026-13-40')).toBe(false)
  })
})

describe('checkSitemap', () => {
  it('规范文件无问题、通过率 100%', () => {
    const r = checkSitemap(VALID)
    expect(r.issues).toHaveLength(0)
    expect(r.passRate).toBe(1)
    expect(r.isIndex).toBe(false)
  })

  it('缺少 XML 声明给出警告', () => {
    const r = checkSitemap('<urlset><url><loc>https://example.com/</loc></url></urlset>')
    expect(r.issues.some((i) => i.level === 'warning' && i.message.includes('XML 声明'))).toBe(true)
  })

  it('索引文件给出提示信息', () => {
    const r = checkSitemap(
      '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://example.com/s.xml</loc></sitemap></sitemapindex>',
    )
    expect(r.isIndex).toBe(true)
    expect(r.issues.some((i) => i.level === 'info' && i.message.includes('索引文件'))).toBe(true)
  })

  it('零条目时报错且通过率为 0', () => {
    const r = checkSitemap('<?xml version="1.0"?><urlset></urlset>')
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('未解析到任何 <url>'))).toBe(true)
    expect(r.passRate).toBe(0)
  })

  it('索引零条目报错信息用 <sitemap>', () => {
    const r = checkSitemap('<?xml version="1.0"?><sitemapindex></sitemapindex>')
    expect(r.issues.some((i) => i.message.includes('<sitemap>'))).toBe(true)
  })

  it('缺失 loc 报错', () => {
    const r = checkSitemap('<?xml version="1.0"?><urlset><url><lastmod>2026-01-01</lastmod></url></urlset>')
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('缺少 <loc>'))).toBe(true)
  })

  it('loc 非绝对 URL 报错', () => {
    const r = checkSitemap('<?xml version="1.0"?><urlset><url><loc>/about</loc></url></urlset>')
    expect(r.issues.some((i) => i.message.includes('不是合法的 http(s) 绝对 URL'))).toBe(true)
  })

  it('重复 loc 报错', () => {
    const r = checkSitemap(
      '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/</loc></url></urlset>',
    )
    expect(r.issues.some((i) => i.message.includes('重复'))).toBe(true)
    expect(r.passRate).toBe(0.5)
  })

  it('lastmod 非法给出警告', () => {
    const r = checkSitemap(
      '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc><lastmod>昨天</lastmod></url></urlset>',
    )
    expect(r.issues.some((i) => i.level === 'warning' && i.message.includes('lastmod'))).toBe(true)
  })

  it('changefreq 非法值给出警告，大小写不敏感', () => {
    const bad = checkSitemap(
      '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc><changefreq>sometimes</changefreq></url></urlset>',
    )
    expect(bad.issues.some((i) => i.message.includes('changefreq'))).toBe(true)
    const ok = checkSitemap(
      '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc><changefreq>DAILY</changefreq></url></urlset>',
    )
    expect(ok.issues).toHaveLength(0)
  })

  it('priority 越界或非数字给出警告', () => {
    for (const p of ['abc', '1.5', '-0.1']) {
      const r = checkSitemap(
        `<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc><priority>${p}</priority></url></urlset>`,
      )
      expect(r.issues.some((i) => i.message.includes('priority'))).toBe(true)
    }
    const ok = checkSitemap(
      '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc><priority>0.5</priority></url></urlset>',
    )
    expect(ok.issues).toHaveLength(0)
  })

  it('超过 50000 条给出警告', () => {
    let xml = '<?xml version="1.0"?><urlset>'
    for (let i = 0; i < 50001; i += 1) xml += `<url><loc>https://example.com/p${i}</loc></url>`
    xml += '</urlset>'
    const r = checkSitemap(xml)
    expect(r.issues.some((i) => i.level === 'warning' && i.message.includes('50000'))).toBe(true)
  })
})

describe('renderReport', () => {
  it('无问题时输出通过结论', () => {
    const text = renderReport(checkSitemap(VALID))
    expect(text).toContain('通过率：100%')
    expect(text).toContain('未发现问题')
  })

  it('三种级别的问题都有对应标记', () => {
    const xml = `<sitemapindex><sitemap><loc>https://example.com/s.xml</loc></sitemap><sitemap><loc>https://example.com/s.xml</loc></sitemap></sitemapindex>`
    const text = renderReport(checkSitemap(xml))
    expect(text).toContain('❌')
    expect(text).toContain('⚠️')
    expect(text).toContain('ℹ️')
  })
})
