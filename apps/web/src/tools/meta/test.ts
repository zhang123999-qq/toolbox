import { describe, expect, it } from 'vitest'
import { buildMetaTags, escapeHtml } from './utils'

describe('meta · escapeHtml', () => {
  it('转义 HTML 特殊字符', () => {
    expect(escapeHtml('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e')
  })
})

describe('meta · buildMetaTags', () => {
  it('只填标题时只输出 title 行', () => {
    expect(buildMetaTags({ title: '我的博客' })).toBe('<title>我的博客</title>\n')
  })

  it('全部字段按顺序输出', () => {
    const out = buildMetaTags({
      title: 'T',
      description: 'D',
      keywords: 'a,b',
      author: 'me',
      viewport: 'width=device-width',
      charset: 'UTF-8',
      themeColor: '#ffffff',
    })
    const lines = out.trim().split('\n')
    expect(lines).toEqual([
      '<title>T</title>',
      '<meta name="description" content="D">',
      '<meta name="keywords" content="a,b">',
      '<meta name="author" content="me">',
      '<meta name="viewport" content="width=device-width">',
      '<meta charset="UTF-8">',
      '<meta name="theme-color" content="#ffffff">',
    ])
  })

  it('空字段整行跳过', () => {
    const out = buildMetaTags({ title: 'T', description: '  ', keywords: 'k' })
    expect(out).not.toContain('description')
    expect(out).toContain('<meta name="keywords" content="k">')
  })

  it('标题为空抛中文错', () => {
    expect(() => buildMetaTags({ title: '   ' })).toThrow('页面标题（title）不能为空')
  })

  it('特殊字符被转义', () => {
    const out = buildMetaTags({ title: 'A&B <C>', description: 'x"y' })
    expect(out).toContain('<title>A&amp;B &lt;C&gt;</title>')
    expect(out).toContain('content="x&quot;y"')
  })

  it('字段首尾空格被清理', () => {
    const out = buildMetaTags({ title: '  T  ', author: ' me ' })
    expect(out).toContain('<title>T</title>')
    expect(out).toContain('content="me"')
  })
})
