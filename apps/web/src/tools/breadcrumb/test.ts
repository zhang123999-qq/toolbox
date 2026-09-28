/**
 * breadcrumb 单元测试
 */
import { describe, expect, it } from 'vitest'
import {
  BreadcrumbError,
  buildBreadcrumbHtml,
  buildBreadcrumbJsonLd,
  parseBreadcrumbItems,
  validateBreadcrumb,
} from './utils'

const INPUT = '首页 || https://example.com/\n产品 || https://example.com/products\n手机'

describe('parseBreadcrumbItems', () => {
  it('空输入抛中文错', () => {
    expect(() => parseBreadcrumbItems('   ')).toThrowError(BreadcrumbError)
    expect(() => parseBreadcrumbItems('   ')).toThrowError('请输入面包屑层级')
  })

  it('解析名称与 URL，跳过空行', () => {
    const items = parseBreadcrumbItems('\n' + INPUT + '\n')
    expect(items).toEqual([
      { name: '首页', url: 'https://example.com/' },
      { name: '产品', url: 'https://example.com/products' },
      { name: '手机', url: '' },
    ])
  })

  it('全是空行时报请输入', () => {
    expect(() => parseBreadcrumbItems('\n  \n')).toThrowError('请输入面包屑层级')
  })
})

describe('buildBreadcrumbHtml', () => {
  it('生成 nav + ol 语义结构，末项带 aria-current', () => {
    const html = buildBreadcrumbHtml(parseBreadcrumbItems(INPUT))
    expect(html).toContain('<nav aria-label="面包屑">')
    expect(html).toContain('<ol>')
    expect(html).toContain('<a href="https://example.com/">首页</a>')
    expect(html).toContain('<span aria-current="page">手机</span>')
  })

  it('无 URL 的中间项渲染为纯文本 span', () => {
    const html = buildBreadcrumbHtml([
      { name: '首页', url: '' },
      { name: '末页', url: 'https://example.com/x' },
    ])
    expect(html).toContain('<li><span>首页</span></li>')
  })

  it('名称与 URL 做 HTML 转义', () => {
    const html = buildBreadcrumbHtml([
      { name: '<b>&"首页"', url: 'https://example.com/?a=1&b=2' },
      { name: '末页', url: '' },
    ])
    expect(html).toContain('<a href="https://example.com/?a=1&amp;b=2">')
    expect(html).toContain('&lt;b&gt;&amp;&quot;首页&quot;')
  })
})

describe('buildBreadcrumbJsonLd', () => {
  it('结构与 #625 兼容：position 连续、有 URL 带 item', () => {
    const obj = JSON.parse(buildBreadcrumbJsonLd(parseBreadcrumbItems(INPUT)))
    expect(obj['@context']).toBe('https://schema.org')
    expect(obj['@type']).toBe('BreadcrumbList')
    expect(obj.itemListElement).toHaveLength(3)
    expect(obj.itemListElement[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      name: '首页',
      item: 'https://example.com/',
    })
    expect(obj.itemListElement[2].position).toBe(3)
    expect(obj.itemListElement[2]).not.toHaveProperty('item')
  })

  it('输出是合法 JSON', () => {
    expect(() => JSON.parse(buildBreadcrumbJsonLd(parseBreadcrumbItems('首页')))).not.toThrow()
  })
})

describe('validateBreadcrumb', () => {
  it('合法输入无问题', () => {
    expect(validateBreadcrumb(parseBreadcrumbItems('首页 || https://example.com/'))).toHaveLength(0)
  })

  it('名称为空报错', () => {
    const issues = validateBreadcrumb([{ name: '', url: 'https://example.com/' }])
    expect(issues.some((i) => i.level === 'error' && i.message.includes('名称不能为空'))).toBe(true)
  })

  it('URL 为空给出提示', () => {
    const issues = validateBreadcrumb([{ name: '手机', url: '' }])
    expect(issues.some((i) => i.level === 'info' && i.message.includes('URL 为空'))).toBe(true)
  })

  it('URL 非法报错', () => {
    const issues = validateBreadcrumb([{ name: '首页', url: '/relative' }])
    expect(issues.some((i) => i.level === 'error' && i.message.includes('绝对地址'))).toBe(true)
  })
})
