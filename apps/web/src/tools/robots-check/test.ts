/**
 * robots-check 单元测试
 */
import { describe, expect, it } from 'vitest'
import { checkRobots, parseRobots, renderReport, RobotsError } from './utils'

const VALID = `User-agent: *
Disallow: /admin/
Allow: /admin/login
Sitemap: https://example.com/sitemap.xml`

describe('parseRobots', () => {
  it('空输入抛中文错', () => {
    expect(() => parseRobots('  ')).toThrowError(RobotsError)
    expect(() => parseRobots('  ')).toThrowError('请输入 robots.txt 内容')
  })

  it('解析分组、规则与 Sitemap，忽略注释与空行', () => {
    const data = parseRobots('# 这是注释\n\n' + VALID + '\nX-Custom: 忽略我\nno-colon-line')
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0].userAgents).toEqual(['*'])
    expect(data.groups[0].rules).toEqual([
      { directive: 'disallow', path: '/admin/' },
      { directive: 'allow', path: '/admin/login' },
    ])
    expect(data.sitemaps).toEqual(['https://example.com/sitemap.xml'])
  })

  it('连续多个 User-agent 归属同一组，规则后出现新 User-agent 另起一组', () => {
    const data = parseRobots('User-agent: a\nUser-agent: b\nDisallow: /x\nUser-agent: c\nDisallow: /y')
    expect(data.groups).toHaveLength(2)
    expect(data.groups[0].userAgents).toEqual(['a', 'b'])
    expect(data.groups[1].userAgents).toEqual(['c'])
  })

  it('Crawl-delay 后出现 User-agent 另起一组', () => {
    const data = parseRobots('User-agent: *\nCrawl-delay: 10\nUser-agent: bot\nDisallow: /')
    expect(data.groups).toHaveLength(2)
    expect(data.groups[0].crawlDelay).toBe('10')
    expect(data.groups[1].userAgents).toEqual(['bot'])
  })

  it('规则出现在 User-agent 之前时归入无名分组', () => {
    const data = parseRobots('Disallow: /tmp\nUser-agent: *\nDisallow: /')
    expect(data.groups).toHaveLength(2)
    expect(data.groups[0].userAgents).toEqual([])
  })

  it('Crawl-delay 出现在 User-agent 之前时归入无名分组', () => {
    const data = parseRobots('Crawl-delay: 5\nUser-agent: *')
    expect(data.groups[0].crawlDelay).toBe('5')
    expect(data.groups[0].userAgents).toEqual([])
  })

  it('行内注释被截断', () => {
    const data = parseRobots('User-agent: * # 主爬虫\nDisallow: /admin/ # 后台')
    expect(data.groups[0].userAgents).toEqual(['*'])
    expect(data.groups[0].rules[0].path).toBe('/admin/')
  })
})

describe('checkRobots', () => {
  it('规范文件无问题', () => {
    const r = checkRobots(parseRobots('User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/s.xml'))
    expect(r.issues).toHaveLength(0)
  })

  it('无分组时报错', () => {
    const r = checkRobots(parseRobots('Sitemap: https://example.com/s.xml'))
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('User-agent 分组'))).toBe(true)
  })

  it('无名分组报错', () => {
    const r = checkRobots(parseRobots('Disallow: /tmp'))
    expect(r.issues.some((i) => i.message.includes('缺少 User-agent'))).toBe(true)
  })

  it('空 User-agent 报错', () => {
    const r = checkRobots(parseRobots('User-agent: \nDisallow: /x'))
    expect(r.issues.some((i) => i.message.includes('User-agent 为空'))).toBe(true)
  })

  it('全站 Disallow 无例外时警告，有 Allow 例外则不警告', () => {
    const bad = checkRobots(parseRobots('User-agent: *\nDisallow: /'))
    expect(bad.issues.some((i) => i.level === 'warning' && i.message.includes('全站'))).toBe(true)
    const ok = checkRobots(parseRobots('User-agent: *\nDisallow: /\nAllow: /public'))
    expect(ok.issues.some((i) => i.message.includes('全站'))).toBe(false)
  })

  it('Allow 与 Disallow 同路径冲突警告', () => {
    const r = checkRobots(parseRobots('User-agent: *\nAllow: /x\nDisallow: /x'))
    expect(r.issues.some((i) => i.message.includes('冲突'))).toBe(true)
  })

  it('Crawl-delay 非法警告、合法通过', () => {
    const bad = checkRobots(parseRobots('User-agent: *\nCrawl-delay: abc'))
    expect(bad.issues.some((i) => i.message.includes('Crawl-delay'))).toBe(true)
    const neg = checkRobots(parseRobots('User-agent: *\nCrawl-delay: -1'))
    expect(neg.issues.some((i) => i.message.includes('Crawl-delay'))).toBe(true)
    const ok = checkRobots(parseRobots('User-agent: *\nCrawl-delay: 10'))
    expect(ok.issues.some((i) => i.message.includes('Crawl-delay'))).toBe(false)
  })

  it('未声明 Sitemap 给出提示', () => {
    const r = checkRobots(parseRobots('User-agent: *\nDisallow: /x'))
    expect(r.issues.some((i) => i.level === 'info' && i.message.includes('Sitemap'))).toBe(true)
  })

  it('Sitemap 非法 URL 报错、重复警告', () => {
    const bad = checkRobots(parseRobots('User-agent: *\nSitemap: /sitemap.xml'))
    expect(bad.issues.some((i) => i.level === 'error' && i.message.includes('Sitemap'))).toBe(true)
    const dup = checkRobots(
      parseRobots('User-agent: *\nSitemap: https://example.com/s.xml\nSitemap: https://example.com/s.xml'),
    )
    expect(dup.issues.some((i) => i.level === 'warning' && i.message.includes('重复'))).toBe(true)
  })
})

describe('renderReport', () => {
  it('规范文件输出通过结论', () => {
    const text = renderReport(checkRobots(parseRobots(VALID)))
    expect(text).toContain('分组数：1')
    expect(text).toContain('未发现问题')
  })

  it('问题与缺失分组都有渲染', () => {
    const text = renderReport(checkRobots(parseRobots('Disallow: /\nSitemap: /bad')))
    expect(text).toContain('（缺失）')
    expect(text).toContain('❌')
    expect(text).toContain('⚠️')
  })

  it('含 Crawl-delay 的分组正常渲染', () => {
    const text = renderReport(checkRobots(parseRobots('User-agent: *\nCrawl-delay: 10\nDisallow: /x')))
    expect(text).toContain('Crawl-delay: 10')
  })
})
