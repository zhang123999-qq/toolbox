import { describe, expect, it } from 'vitest'
import { buildTwitterCardTags, escapeHtmlAttr } from './utils'

describe('twitter-card · escapeHtmlAttr', () => {
  it('转义属性特殊字符', () => {
    expect(escapeHtmlAttr('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e')
  })
})

describe('twitter-card · buildTwitterCardTags', () => {
  it('只填标题时输出 card 默认值与 title', () => {
    expect(buildTwitterCardTags({ title: '文章标题' })).toBe(
      '<meta name="twitter:card" content="summary">\n' +
        '<meta name="twitter:title" content="文章标题">\n',
    )
  })

  it('全部字段按顺序输出', () => {
    const out = buildTwitterCardTags({
      title: 'T',
      card: 'summary_large_image',
      description: 'D',
      image: 'https://example.com/cover.png',
      site: '@example',
    })
    expect(out.trim().split('\n')).toEqual([
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:title" content="T">',
      '<meta name="twitter:description" content="D">',
      '<meta name="twitter:image" content="https://example.com/cover.png">',
      '<meta name="twitter:site" content="@example">',
    ])
  })

  it('空字段整行跳过', () => {
    const out = buildTwitterCardTags({ title: 'T', description: ' ', site: '@x' })
    expect(out).not.toContain('twitter:description')
    expect(out).toContain('twitter:site')
  })

  it('标题为空抛中文错', () => {
    expect(() => buildTwitterCardTags({ title: '  ' })).toThrow('twitter:title 不能为空')
  })

  it('卡片类型非法抛中文错', () => {
    expect(() => buildTwitterCardTags({ title: 'T', card: 'player' })).toThrow(
      'twitter:card 类型非法',
    )
  })

  it('card 为空字符串时回退 summary', () => {
    const out = buildTwitterCardTags({ title: 'T', card: '  ' })
    expect(out).toContain('<meta name="twitter:card" content="summary">')
  })

  it('特殊字符被转义', () => {
    const out = buildTwitterCardTags({ title: 'A&B', site: '@a"b' })
    expect(out).toContain('content="A&amp;B"')
    expect(out).toContain('content="@a&quot;b"')
  })
})
