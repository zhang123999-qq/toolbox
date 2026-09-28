import { describe, expect, it } from 'vitest'
import type { SocialShareOptions } from './schema'
import { assertShareUrl, buildShareLinks, PLATFORMS, renderLinks, transform } from './utils'

const URL = 'https://example.com/a?x=1&y=2'
const U = encodeURIComponent(URL)
const TITLE = '中文标题'
const T = encodeURIComponent(TITLE)
const TEXT = '摘要 text'
const D = encodeURIComponent(TEXT)

const EMPTY_OPTS: SocialShareOptions = { shareTitle: '', shareText: '' }

describe('social-share / assertShareUrl', () => {
  it('合法 URL 返回规范化后的 href', () => {
    expect(assertShareUrl('https://example.com')).toBe('https://example.com/')
    expect(assertShareUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1')
  })

  it('前后空白会被去除', () => {
    expect(assertShareUrl('  https://example.com/article  ')).toBe(
      'https://example.com/article',
    )
  })

  it('空输入报错', () => {
    expect(() => assertShareUrl('')).toThrow(/请输入/)
    expect(() => assertShareUrl('   ')).toThrow(/请输入/)
  })

  it('非 http(s) 开头报错', () => {
    expect(() => assertShareUrl('ftp://example.com')).toThrow(/http/)
    expect(() => assertShareUrl('example.com')).toThrow(/http/)
  })

  it('非法 URL 格式报错', () => {
    expect(() => assertShareUrl('https://')).toThrow(/格式/)
    expect(() => assertShareUrl('http://exa mple.com')).toThrow(/格式/)
  })
})

describe('social-share / buildShareLinks', () => {
  it('8 个平台 URL 精确断言（中文标题与 & 正确编码）', () => {
    const links = buildShareLinks({ url: URL, title: TITLE, text: TEXT })
    expect(links.x).toBe(`https://twitter.com/intent/tweet?url=${U}&text=${T}`)
    expect(links.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${U}`)
    expect(links.linkedin).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${U}`)
    expect(links.weibo).toBe(`https://service.weibo.com/share/share.php?url=${U}&title=${T}`)
    expect(links.telegram).toBe(`https://t.me/share/url?url=${U}&text=${D}`)
    expect(links.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(`${TITLE} ${URL}`)}`)
    expect(links.reddit).toBe(`https://www.reddit.com/submit?url=${U}&title=${T}`)
    expect(links.email).toBe(
      `mailto:?subject=${T}&body=${encodeURIComponent(`${TEXT}\n${URL}`)}`,
    )
  })

  it('无 title/text 时省略可选参数', () => {
    const links = buildShareLinks({ url: URL })
    expect(links.x).toBe(`https://twitter.com/intent/tweet?url=${U}`)
    expect(links.weibo).toBe(`https://service.weibo.com/share/share.php?url=${U}`)
    expect(links.telegram).toBe(`https://t.me/share/url?url=${U}`)
    expect(links.whatsapp).toBe(`https://wa.me/?text=${U}`)
    expect(links.reddit).toBe(`https://www.reddit.com/submit?url=${U}`)
    expect(links.email).toBe(`mailto:?body=${U}`)
    expect(links.x).not.toContain('&text=')
    expect(links.email).not.toContain('subject=')
  })

  it('有 title 无 text：telegram 用标题，email 只有 subject', () => {
    const links = buildShareLinks({ url: URL, title: TITLE })
    expect(links.telegram).toBe(`https://t.me/share/url?url=${U}&text=${T}`)
    expect(links.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(`${TITLE} ${URL}`)}`)
    expect(links.email).toBe(`mailto:?subject=${T}&body=${U}`)
  })

  it('有 text 无 title：telegram 用摘要，email 无 subject', () => {
    const links = buildShareLinks({ url: URL, text: TEXT })
    expect(links.telegram).toBe(`https://t.me/share/url?url=${U}&text=${D}`)
    expect(links.x).toBe(`https://twitter.com/intent/tweet?url=${U}`)
    expect(links.whatsapp).toBe(`https://wa.me/?text=${U}`)
    expect(links.email).toBe(`mailto:?body=${encodeURIComponent(`${TEXT}\n${URL}`)}`)
  })

  it('facebook / linkedin 不受 title/text 影响', () => {
    const links = buildShareLinks({ url: URL, title: TITLE, text: TEXT })
    expect(links.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${U}`)
    expect(links.linkedin).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${U}`)
  })
})

describe('social-share / renderLinks', () => {
  it('输出 8 行，格式为「平台名：URL」', () => {
    const links = buildShareLinks({ url: URL })
    const lines = renderLinks(links).split('\n')
    expect(lines).toHaveLength(8)
    expect(lines[0]).toBe(`X：https://twitter.com/intent/tweet?url=${U}`)
    expect(lines[3]).toBe(`微博：https://service.weibo.com/share/share.php?url=${U}`)
    expect(lines[7]).toBe(`邮件：mailto:?body=${U}`)
    for (const p of PLATFORMS) {
      expect(renderLinks(links)).toContain(`${p.name}：`)
    }
  })
})

describe('social-share / transform', () => {
  it('合法输入输出 8 个平台的分享链接', () => {
    const out = transform(
      { text: 'https://example.com/article' },
      { shareTitle: '标题', shareText: '' },
    )
    for (const p of PLATFORMS) {
      expect(out).toContain(p.name)
    }
    expect(out).toContain('twitter.com/intent/tweet')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '   ' }, EMPTY_OPTS)).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, EMPTY_OPTS)).toThrow(/上限/)
  })

  it('非法 URL 报错', () => {
    expect(() => transform({ text: 'not-a-url' }, EMPTY_OPTS)).toThrow(/http/)
  })
})
