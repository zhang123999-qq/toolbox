import { describe, expect, it } from 'vitest'
import { buildRobotsTxt, parseRobotRules } from './utils'
import type { RobotRule } from './utils'

describe('robots · parseRobotRules', () => {
  it('解析多行规则并忽略空行与注释', () => {
    const rules = parseRobotRules('* disallow /private\n\n# 这是注释\n* allow /private/public')
    expect(rules).toEqual([
      { agent: '*', directive: 'disallow', path: '/private' },
      { agent: '*', directive: 'allow', path: '/private/public' },
    ])
  })

  it('指令大小写不敏感', () => {
    const rules = parseRobotRules('Googlebot ALLOW /tmp')
    expect(rules[0].directive).toBe('allow')
  })

  it('空文本解析为空数组', () => {
    expect(parseRobotRules('   \n  ')).toEqual([])
  })

  it('列数不对抛中文错并带行号', () => {
    expect(() => parseRobotRules('* disallow')).toThrow('第 1 行格式不正确')
    expect(() => parseRobotRules('*\n* disallow /a')).toThrow('第 1 行格式不正确')
  })

  it('非法指令抛中文错并带行号', () => {
    expect(() => parseRobotRules('* deny /private')).toThrow('第 1 行指令必须是 allow 或 disallow')
  })

  it('路径不以 / 开头抛中文错', () => {
    expect(() => parseRobotRules('* disallow private')).toThrow('第 1 行路径必须以 / 开头')
  })
})

describe('robots · buildRobotsTxt', () => {
  const RULES: RobotRule[] = [
    { agent: '*', directive: 'disallow', path: '/private' },
    { agent: '*', directive: 'allow', path: '/private/public' },
    { agent: 'Googlebot', directive: 'disallow', path: '/tmp' },
  ]

  it('按 User-agent 分组生成标准文本', () => {
    const out = buildRobotsTxt(RULES)
    expect(out).toBe(
      'User-agent: *\n' +
        'Disallow: /private\n' +
        'Allow: /private/public\n' +
        '\n' +
        'User-agent: Googlebot\n' +
        'Disallow: /tmp\n',
    )
  })

  it('单个分组不加多余空行', () => {
    const out = buildRobotsTxt([{ agent: '*', directive: 'disallow', path: '/' }])
    expect(out).toBe('User-agent: *\nDisallow: /\n')
  })

  it('空规则数组抛中文错', () => {
    expect(() => buildRobotsTxt([])).toThrow('请至少添加一条规则')
  })

  it('附加 Sitemap 行', () => {
    const out = buildRobotsTxt(RULES.slice(0, 1), { sitemap: 'https://example.com/sitemap.xml' })
    expect(out).toContain('\nSitemap: https://example.com/sitemap.xml\n')
  })

  it('Sitemap 非法抛中文错', () => {
    expect(() => buildRobotsTxt(RULES.slice(0, 1), { sitemap: 'not a url' })).toThrow(
      'Sitemap URL 不合法',
    )
  })

  it('Sitemap 非 http(s) 抛中文错', () => {
    expect(() => buildRobotsTxt(RULES.slice(0, 1), { sitemap: 'ftp://example.com/s.xml' })).toThrow(
      'Sitemap URL 必须以 http:// 或 https:// 开头',
    )
  })

  it('附加 Crawl-delay 行', () => {
    const out = buildRobotsTxt(RULES.slice(0, 1), { crawlDelay: '10' })
    expect(out).toContain('\nCrawl-delay: 10\n')
  })

  it('Crawl-delay 非数字抛中文错', () => {
    expect(() => buildRobotsTxt(RULES.slice(0, 1), { crawlDelay: 'abc' })).toThrow(
      'Crawl-delay 必须是非负整数',
    )
    expect(() => buildRobotsTxt(RULES.slice(0, 1), { crawlDelay: '-5' })).toThrow(
      'Crawl-delay 必须是非负整数',
    )
  })

  it('Sitemap 与 Crawl-delay 可同时附加', () => {
    const out = buildRobotsTxt(RULES.slice(0, 1), {
      sitemap: 'https://example.com/sitemap.xml',
      crawlDelay: '5',
    })
    expect(out).toContain('Sitemap: https://example.com/sitemap.xml')
    expect(out).toContain('Crawl-delay: 5')
  })

  it('端到端：解析文本直出 robots.txt', () => {
    const out = buildRobotsTxt(parseRobotRules('* disallow /private\n* allow /x'))
    expect(out).toContain('User-agent: *')
    expect(out).toContain('Disallow: /private')
    expect(out).toContain('Allow: /x')
  })
})
