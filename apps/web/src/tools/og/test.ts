import { describe, expect, it } from 'vitest'
import { buildOgTags, escapeHtmlAttr } from './utils'

describe('og · escapeHtmlAttr', () => {
  it('转义属性特殊字符', () => {
    expect(escapeHtmlAttr('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e')
  })
})

describe('og · buildOgTags', () => {
  it('只填标题时输出 title 与默认 type', () => {
    expect(buildOgTags({ title: '文章标题' })).toBe(
      '<meta property="og:title" content="文章标题">\n' +
        '<meta property="og:type" content="website">\n',
    )
  })

  it('全部字段按顺序输出', () => {
    const out = buildOgTags({
      title: 'T',
      description: 'D',
      image: 'https://example.com/cover.png',
      url: 'https://example.com/post',
      type: 'article',
      siteName: '我的博客',
    })
    expect(out.trim().split('\n')).toEqual([
      '<meta property="og:title" content="T">',
      '<meta property="og:type" content="article">',
      '<meta property="og:description" content="D">',
      '<meta property="og:image" content="https://example.com/cover.png">',
      '<meta property="og:url" content="https://example.com/post">',
      '<meta property="og:site_name" content="我的博客">',
    ])
  })

  it('空字段整行跳过', () => {
    const out = buildOgTags({ title: 'T', description: ' ', image: 'https://example.com/i.png' })
    expect(out).not.toContain('og:description')
    expect(out).toContain('og:image')
  })

  it('标题为空抛中文错', () => {
    expect(() => buildOgTags({ title: '  ' })).toThrow('og:title 不能为空')
  })

  it('特殊字符被转义', () => {
    const out = buildOgTags({ title: 'A&B', description: 'x"y' })
    expect(out).toContain('content="A&amp;B"')
    expect(out).toContain('content="x&quot;y"')
  })

  it('type 为空字符串时回退 website', () => {
    const out = buildOgTags({ title: 'T', type: '   ' })
    expect(out).toContain('<meta property="og:type" content="website">')
  })
})
