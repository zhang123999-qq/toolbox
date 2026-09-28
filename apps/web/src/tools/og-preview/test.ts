import { describe, expect, it, vi } from 'vitest'
import type { OgPreviewOptions } from './schema'
import {
  extractMetaTags,
  extractOgTags,
  fetchHtml,
  getMissingSuggestions,
  renderSummary,
  resolveUrl,
  transform,
} from './utils'
import type { OgTags } from './utils'

const FULL_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>页面标题回退</title>
<meta name="description" content="meta 描述回退">
<meta property="og:title" content="OG 标题">
<meta property="og:description" content="OG 描述">
<meta property="og:image" content="/cover.png">
<meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/post">
<meta property="og:site_name" content="示例站">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="推特标题">
<meta name="twitter:description" content="推特描述">
<meta name="twitter:image" content="https://example.com/tw.png">
<link rel="icon" href="/favicon.ico">
</head><body></body></html>`

const FULL_TAGS: OgTags = {
  title: 'OG 标题',
  description: 'OG 描述',
  image: 'https://example.com/cover.png',
  twitterCard: 'summary_large_image',
}

/** 构造一个返回指定响应的 mock fetch */
function mockFetch(response: unknown): typeof fetch {
  return vi.fn(async () => response) as unknown as typeof fetch
}

function okHtml(html: string, contentType: string | null = 'text/html; charset=utf-8'): unknown {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => html,
  }
}

describe('og-preview / extractMetaTags', () => {
  it('双引号常规解析', () => {
    expect(extractMetaTags('<meta property="og:title" content="标题">')).toEqual([
      { key: 'og:title', content: '标题' },
    ])
  })

  it('支持单引号与属性倒序', () => {
    const tags = extractMetaTags("<meta content='描述' property='og:description'>")
    expect(tags).toEqual([{ key: 'og:description', content: '描述' }])
  })

  it('标签名与属性名大小写不敏感', () => {
    const tags = extractMetaTags('<META PROPERTY="og:type" CONTENT="website">')
    expect(tags).toEqual([{ key: 'og:type', content: 'website' }])
  })

  it('支持无引号属性值', () => {
    const tags = extractMetaTags('<meta property=og:url content=https://example.com/a>')
    expect(tags).toEqual([{ key: 'og:url', content: 'https://example.com/a' }])
  })

  it('name 属性同样识别', () => {
    expect(extractMetaTags('<meta name="description" content="d">')).toEqual([
      { key: 'description', content: 'd' },
    ])
  })

  it('无 content 的标签跳过', () => {
    expect(extractMetaTags('<meta property="og:title">')).toEqual([])
  })

  it('无 property/name 的标签跳过', () => {
    expect(extractMetaTags('<meta charset="utf-8"><meta content="x">')).toEqual([])
  })

  it('空字符串返回空数组', () => {
    expect(extractMetaTags('')).toEqual([])
  })

  it('裸 meta 标签不报错', () => {
    expect(extractMetaTags('<meta>')).toEqual([])
  })
})

describe('og-preview / extractOgTags', () => {
  it('完整提取 og 与 twitter 标签', () => {
    const tags = extractOgTags(FULL_HTML)
    expect(tags.title).toBe('OG 标题')
    expect(tags.description).toBe('OG 描述')
    expect(tags.image).toBe('/cover.png')
    expect(tags.type).toBe('article')
    expect(tags.url).toBe('https://example.com/post')
    expect(tags.siteName).toBe('示例站')
    expect(tags.twitterCard).toBe('summary_large_image')
    expect(tags.twitterTitle).toBe('推特标题')
    expect(tags.twitterDescription).toBe('推特描述')
    expect(tags.twitterImage).toBe('https://example.com/tw.png')
    expect(tags.favicon).toBe('/favicon.ico')
  })

  it('og:title 缺失时回退到 <title> 文本', () => {
    const tags = extractOgTags('<html><head><title>  回退标题  </title></head></html>')
    expect(tags.title).toBe('回退标题')
  })

  it('无 title 标签时 title 为 undefined', () => {
    expect(extractOgTags('<html><head></head></html>').title).toBeUndefined()
  })

  it('og:description 缺失时回退到 meta description', () => {
    const tags = extractOgTags(
      '<html><head><meta name="description" content="meta 描述"></head></html>',
    )
    expect(tags.description).toBe('meta 描述')
  })

  it('两者都缺失时 description 为 undefined', () => {
    expect(extractOgTags('<html><head></head></html>').description).toBeUndefined()
  })

  it('shortcut icon 也识别为 favicon', () => {
    const tags = extractOgTags('<html><head><link rel="shortcut icon" href="/s.ico"></head></html>')
    expect(tags.favicon).toBe('/s.ico')
  })

  it('rel 含 icon 但无 href 时跳过', () => {
    expect(extractOgTags('<html><head><link rel="icon"></head></html>').favicon).toBeUndefined()
  })

  it('无 rel 的 link 跳过', () => {
    expect(extractOgTags('<html><head><link href="/a.css"></head></html>').favicon).toBeUndefined()
  })

  it('裸 link 标签不报错', () => {
    expect(extractOgTags('<html><head><link></head></html>').favicon).toBeUndefined()
  })

  it('无 link 标签时 favicon 为 undefined', () => {
    expect(extractOgTags('<html><head></head></html>').favicon).toBeUndefined()
  })
})

describe('og-preview / getMissingSuggestions', () => {
  it('全缺返回 4 条中文建议', () => {
    const suggestions = getMissingSuggestions({})
    expect(suggestions).toHaveLength(4)
    expect(suggestions.join('\n')).toContain('缺少 og:image')
  })

  it('全齐返回空数组', () => {
    expect(getMissingSuggestions(FULL_TAGS)).toEqual([])
  })

  it('部分缺失只返回缺失项', () => {
    const suggestions = getMissingSuggestions({ title: 't', image: 'i' })
    expect(suggestions).toHaveLength(2)
    const joined = suggestions.join('\n')
    expect(joined).toContain('缺少 og:description')
    expect(joined).toContain('缺少 twitter:card')
    expect(joined).not.toContain('缺少 og:title')
  })
})

describe('og-preview / resolveUrl', () => {
  it('相对路径转绝对', () => {
    expect(resolveUrl('https://example.com/post', '/cover.png')).toBe('https://example.com/cover.png')
  })

  it('绝对 URL 保持不变', () => {
    expect(resolveUrl('https://example.com/post', 'https://cdn.com/a.png')).toBe(
      'https://cdn.com/a.png',
    )
  })

  it('解析失败返回原值', () => {
    expect(resolveUrl('not a url', ':::')).toBe(':::')
  })
})

describe('og-preview / fetchHtml', () => {
  it('成功返回 HTML 文本', async () => {
    const fetchFn = mockFetch(okHtml('<html></html>'))
    await expect(fetchHtml('https://example.com', fetchFn)).resolves.toBe('<html></html>')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('空 URL 抛错', async () => {
    await expect(fetchHtml('   ', mockFetch(null))).rejects.toThrow(/请输入/)
  })

  it('非法 URL 抛错', async () => {
    await expect(fetchHtml('not a url', mockFetch(null))).rejects.toThrow(/格式/)
  })

  it('非 http(s) 协议抛错', async () => {
    await expect(fetchHtml('ftp://example.com/x', mockFetch(null))).rejects.toThrow(/只支持 http/)
  })

  it('非 2xx 抛错', async () => {
    const fetchFn = mockFetch({ ok: false, status: 404 })
    await expect(fetchHtml('https://example.com', fetchFn)).rejects.toThrow(/HTTP 404/)
  })

  it('AbortError 抛超时错', async () => {
    const fetchFn = mockFetch(Promise.reject(new DOMException('aborted', 'AbortError')))
    await expect(fetchHtml('https://example.com', fetchFn)).rejects.toThrow(/超时/)
  })

  it('15 秒无响应自动 abort 并抛超时错', async () => {
    vi.useFakeTimers()
    try {
      const hanging = ((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        })
      }) as unknown as typeof fetch
      const pending = fetchHtml('https://example.com', hanging)
      // 先挂上断言再推进时钟，避免拒绝在 handler 挂载前被判为 unhandled
      const assertion = expect(pending).rejects.toThrow(/超时/)
      await vi.advanceTimersByTimeAsync(15000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('非 AbortError 的 DOMException 走网络错误', async () => {
    const fetchFn = mockFetch(Promise.reject(new DOMException('x', 'NetworkError')))
    await expect(fetchHtml('https://example.com', fetchFn)).rejects.toThrow(/CORS/)
  })

  it('普通 Error 注明改用粘贴模式', async () => {
    const fetchFn = mockFetch(Promise.reject(new Error('boom')))
    await expect(fetchHtml('https://example.com', fetchFn)).rejects.toThrow(/改用「粘贴 HTML」模式/)
  })

  it('非 Error 异常也转中文错', async () => {
    const fetchFn = mockFetch(Promise.reject('string fail'))
    await expect(fetchHtml('https://example.com', fetchFn)).rejects.toThrow(/网络请求失败/)
  })

  it('非 HTML content-type 抛错', async () => {
    const fetchFn = mockFetch(okHtml('{}', 'application/json'))
    await expect(fetchHtml('https://example.com', fetchFn)).rejects.toThrow(/不是 HTML/)
  })

  it('缺 content-type 时标注未知', async () => {
    const fetchFn = mockFetch(okHtml('<html></html>', null))
    await expect(fetchHtml('https://example.com', fetchFn)).rejects.toThrow(/未知/)
  })

  it('读取正文失败抛错', async () => {
    const bad = {
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => {
        throw new Error('bad')
      },
    }
    await expect(fetchHtml('https://example.com', mockFetch(bad))).rejects.toThrow(
      /读取响应正文失败/,
    )
  })

  it('读取正文抛非 Error 也转中文错', async () => {
    const bad = {
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => {
        throw 'bad'
      },
    }
    await expect(fetchHtml('https://example.com', mockFetch(bad))).rejects.toThrow(
      /读取响应正文失败/,
    )
  })
})

describe('og-preview / renderSummary', () => {
  it('缺失字段标（未设置）', () => {
    const out = renderSummary({})
    expect(out).toContain('og:title：（未设置）')
    expect(out).toContain('twitter:card：（未设置）')
  })

  it('完整字段逐行渲染', () => {
    const out = renderSummary({ ...FULL_TAGS, twitterImage: 'https://example.com/tw.png' })
    expect(out).toContain('og:title：OG 标题')
    expect(out).toContain('og:image：https://example.com/cover.png')
    expect(out).toContain('twitter:image：https://example.com/tw.png')
    expect(out.split('\n')).toHaveLength(10)
  })
})

describe('og-preview / transform', () => {
  const options: OgPreviewOptions = { mode: 'paste' }

  it('空输入抛错', async () => {
    await expect(transform({ text: '   ' }, options)).rejects.toThrow(/请输入页面 URL/)
  })

  it('超长输入抛错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, options)).rejects.toThrow(/上限/)
  })

  it('paste 模式直接提取', async () => {
    const out = await transform({ text: FULL_HTML }, { mode: 'paste' })
    expect(out).toContain('og:title：OG 标题')
    expect(out).toContain('twitter:card：summary_large_image')
  })

  it('fetch 模式抓取后提取', async () => {
    const fetchFn = mockFetch(okHtml(FULL_HTML))
    const out = await transform({ text: 'https://example.com/post' }, { mode: 'fetch' }, fetchFn)
    expect(out).toContain('og:title：OG 标题')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
