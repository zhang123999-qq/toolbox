import { describe, expect, it } from 'vitest'
import {
  buildJsonLd,
  parseBreadcrumbLines,
  parseFaqLines,
  parseUrlLines,
} from './utils'

describe('json-ld · parseFaqLines', () => {
  it('解析「问题 || 答案」多行', () => {
    expect(parseFaqLines('退货吗 || 支持7天无理由\n\n运费谁出 || 卖家承担')).toEqual([
      { question: '退货吗', answer: '支持7天无理由' },
      { question: '运费谁出', answer: '卖家承担' },
    ])
  })

  it('空文本与纯空行返回空数组', () => {
    expect(parseFaqLines(undefined)).toEqual([])
    expect(parseFaqLines('  \n \n')).toEqual([])
  })

  it('缺分隔符抛中文错并带行号', () => {
    expect(() => parseFaqLines('只有问题没有分隔符')).toThrow('第 1 行格式错误，应为「问题 || 答案」')
  })

  it('分隔符两侧为空抛错', () => {
    expect(() => parseFaqLines('问题 ||   ')).toThrow('第 1 行格式错误')
  })

  it('多个分隔符抛错', () => {
    expect(() => parseFaqLines('a || b || c')).toThrow('第 1 行格式错误')
  })

  it('错误行号指向第二行', () => {
    expect(() => parseFaqLines('q1 || a1\n坏行')).toThrow('第 2 行')
  })
})

describe('json-ld · parseBreadcrumbLines', () => {
  it('解析「名称 || URL」多行', () => {
    expect(parseBreadcrumbLines('首页 || https://example.com/\n分类 || https://example.com/c')).toEqual([
      { name: '首页', url: 'https://example.com/' },
      { name: '分类', url: 'https://example.com/c' },
    ])
  })

  it('空文本返回空数组', () => {
    expect(parseBreadcrumbLines('')).toEqual([])
  })

  it('格式错误抛中文错', () => {
    expect(() => parseBreadcrumbLines('只有名称')).toThrow('第 1 行格式错误，应为「名称 || URL」')
  })

  it('非 http(s) URL 抛错', () => {
    expect(() => parseBreadcrumbLines('首页 || ftp://example.com/')).toThrow('第 1 行 URL 不合法')
  })

  it('相对路径抛错', () => {
    expect(() => parseBreadcrumbLines('首页 || /index')).toThrow('第 1 行 URL 不合法')
  })
})

describe('json-ld · parseUrlLines', () => {
  it('解析多行 URL 并跳过空行', () => {
    expect(parseUrlLines('https://a.com\n\nhttps://b.com\n')).toEqual(['https://a.com', 'https://b.com'])
  })

  it('空文本返回空数组', () => {
    expect(parseUrlLines(undefined)).toEqual([])
  })

  it('非法 URL 抛中文错带行号', () => {
    expect(() => parseUrlLines('https://a.com\nnot-a-url')).toThrow('第 2 行 URL 不合法')
  })
})

describe('json-ld · buildJsonLd / Article', () => {
  it('只填标题时输出最小 Article', () => {
    const out = buildJsonLd('Article', { headline: '标题' })
    expect(out).toContain('<script type="application/ld+json">')
    const obj = JSON.parse(out.replace(/<script[^>]*>\n?/, '').replace(/\n<\/script>\n?$/, ''))
    expect(obj).toMatchObject({ '@context': 'https://schema.org', '@type': 'Article', headline: '标题' })
  })

  it('全部字段按结构输出', () => {
    const out = buildJsonLd('Article', {
      headline: 'H',
      description: 'D',
      author: '张三',
      datePublished: '2026-09-28',
      image: 'https://example.com/i.png',
      url: 'https://example.com/p',
    })
    const obj = JSON.parse(out.replace(/<script[^>]*>\n?/, '').replace(/\n<\/script>\n?$/, ''))
    expect(obj.author).toEqual({ '@type': 'Person', name: '张三' })
    expect(obj.datePublished).toBe('2026-09-28')
    expect(obj.image).toBe('https://example.com/i.png')
  })

  it('标题为空抛中文错', () => {
    expect(() => buildJsonLd('Article', { headline: '  ' })).toThrow('Article 的 headline（标题）不能为空')
  })

  it('空的可选字段不出现在输出里', () => {
    const out = buildJsonLd('Article', { headline: 'H', description: ' ' })
    expect(out).not.toContain('description')
  })
})

describe('json-ld · buildJsonLd / Product', () => {
  it('商品名必填缺失抛错', () => {
    expect(() => buildJsonLd('Product', {})).toThrow('Product 的 name（商品名）不能为空')
  })

  it('价格与货币组装为 Offer', () => {
    const out = buildJsonLd('Product', { name: '手机', brand: '某牌', price: '1999', priceCurrency: 'CNY' })
    const obj = JSON.parse(out.replace(/<script[^>]*>\n?/, '').replace(/\n<\/script>\n?$/, ''))
    expect(obj.brand).toEqual({ '@type': 'Brand', name: '某牌' })
    expect(obj.offers).toEqual({ '@type': 'Offer', price: '1999', priceCurrency: 'CNY' })
  })

  it('只填价格也有 Offer', () => {
    const out = buildJsonLd('Product', { name: '手机', price: '1999' })
    expect(out).toContain('"price": "1999"')
    expect(out).not.toContain('priceCurrency')
  })

  it('只填货币也有 Offer', () => {
    const out = buildJsonLd('Product', { name: '手机', priceCurrency: 'USD' })
    expect(out).toContain('"priceCurrency": "USD"')
  })

  it('无价格信息时没有 offers', () => {
    const out = buildJsonLd('Product', { name: '手机' })
    expect(out).not.toContain('offers')
  })
})

describe('json-ld · buildJsonLd / FAQPage', () => {
  it('问答组装为 mainEntity', () => {
    const out = buildJsonLd('FAQPage', { questions: '退货吗 || 支持7天\n运费 || 包邮' })
    const obj = JSON.parse(out.replace(/<script[^>]*>\n?/, '').replace(/\n<\/script>\n?$/, ''))
    expect(obj['@type']).toBe('FAQPage')
    expect(obj.mainEntity).toHaveLength(2)
    expect(obj.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: '退货吗',
      acceptedAnswer: { '@type': 'Answer', text: '支持7天' },
    })
  })

  it('无问答抛中文错', () => {
    expect(() => buildJsonLd('FAQPage', { questions: '  ' })).toThrow('FAQPage 至少需要 1 条问答')
  })

  it('问答格式错误透出中文错', () => {
    expect(() => buildJsonLd('FAQPage', { questions: '坏行' })).toThrow('第 1 行格式错误')
  })
})

describe('json-ld · buildJsonLd / BreadcrumbList', () => {
  it('面包屑带 position 序号', () => {
    const out = buildJsonLd('BreadcrumbList', {
      breadcrumbs: '首页 || https://example.com/\n文章 || https://example.com/a',
    })
    const obj = JSON.parse(out.replace(/<script[^>]*>\n?/, '').replace(/\n<\/script>\n?$/, ''))
    expect(obj.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: '首页', item: 'https://example.com/' },
      { '@type': 'ListItem', position: 2, name: '文章', item: 'https://example.com/a' },
    ])
  })

  it('无面包屑抛中文错', () => {
    expect(() => buildJsonLd('BreadcrumbList', {})).toThrow('BreadcrumbList 至少需要 1 条面包屑')
  })
})

describe('json-ld · buildJsonLd / Organization', () => {
  it('组织名必填缺失抛错', () => {
    expect(() => buildJsonLd('Organization', { url: 'https://example.com' })).toThrow(
      'Organization 的 name（组织名）不能为空',
    )
  })

  it('sameAs 多行 URL 组装为数组', () => {
    const out = buildJsonLd('Organization', {
      name: '公司',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
      sameAs: 'https://weibo.com/x\nhttps://x.com/x',
    })
    const obj = JSON.parse(out.replace(/<script[^>]*>\n?/, '').replace(/\n<\/script>\n?$/, ''))
    expect(obj.sameAs).toEqual(['https://weibo.com/x', 'https://x.com/x'])
  })

  it('无 sameAs 时不输出该字段', () => {
    const out = buildJsonLd('Organization', { name: '公司' })
    expect(out).not.toContain('sameAs')
  })
})

describe('json-ld · 安全与格式', () => {
  it('输出整体是合法 JSON', () => {
    const out = buildJsonLd('Article', { headline: '含"引号"与\n换行' })
    expect(() => JSON.parse(out.replace(/<script[^>]*>\n?/, '').replace(/\n<\/script>\n?$/, ''))).not.toThrow()
  })

  it('内容中的 </script 被转义防止提前闭合', () => {
    const out = buildJsonLd('Article', { headline: 'x', description: 'a</script>b' })
    expect(out).not.toMatch(/a<\/script>b/)
    expect(out).toContain('a<\\/script>b')
  })

  it('JSON 缩进为 2 格', () => {
    const out = buildJsonLd('Product', { name: 'N' })
    expect(out).toContain('\n  "@type": "Product"')
  })

  it('输出以 script 标签包裹并换行结尾', () => {
    const out = buildJsonLd('Product', { name: 'N' })
    expect(out.startsWith('<script type="application/ld+json">\n')).toBe(true)
    expect(out.endsWith('\n</script>\n')).toBe(true)
  })
})
