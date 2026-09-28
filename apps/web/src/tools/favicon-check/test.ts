import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CHECK_TIMEOUT_MS,
  assertPageUrl,
  buildSuggestions,
  checkFavicon,
  checkUrl,
  defaultCandidates,
  parseIconLinks,
  renderReport,
  sourceLabel,
  transform,
} from './utils'
import type { CheckResult, IconLink } from './utils'
import type { FaviconCheckOptions } from './schema'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** 构造 mock Response */
function mockResponse(status: number, contentType: string | null = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
  } as Response
}

type Handler = (
  url: string,
  init?: { method?: string; signal?: AbortSignal },
) => Response | Promise<Response>

function mockFetch(handler: Handler): typeof fetch {
  return (async (url: unknown, init?: { method?: string; signal?: AbortSignal }) =>
    handler(String(url), init)) as unknown as typeof fetch
}

const okResult: CheckResult = {
  url: 'https://example.com/favicon.ico',
  ok: true,
  status: 200,
  contentType: 'image/x-icon',
  note: '可访问',
}
const failResult: CheckResult = {
  url: 'https://example.com/favicon.ico',
  ok: false,
  status: null,
  contentType: null,
  note: '请求失败：boom',
}

describe('favicon-check / parseIconLinks', () => {
  const base = 'https://example.com/sub/page.html'

  it('收录多种 rel 写法并解析为绝对地址', () => {
    const html = [
      '<link rel="icon" href="/a.png">',
      '<link rel="shortcut icon" href="/b.ico">',
      '<link rel="apple-touch-icon" href="/c.png">',
      '<link rel="apple-touch-icon-precomposed" href="/d.png">',
      '<link rel="mask-icon" href="/e.svg">',
    ].join('\n')
    const icons = parseIconLinks(html, 'https://example.com/')
    expect(icons).toHaveLength(5)
    expect(icons[0]).toMatchObject({ href: 'https://example.com/a.png', rel: 'icon' })
    expect(icons[1]).toMatchObject({ href: 'https://example.com/b.ico', rel: 'shortcut icon' })
    expect(icons[4]).toMatchObject({ href: 'https://example.com/e.svg', rel: 'mask-icon' })
  })

  it('rel 大小写不敏感', () => {
    const icons = parseIconLinks('<LINK REL="ICON" HREF="/a.png">', 'https://example.com/')
    expect(icons).toHaveLength(1)
    expect(icons[0]!.href).toBe('https://example.com/a.png')
  })

  it('单引号与无引号属性、sizes/type 保留', () => {
    const icons = parseIconLinks(
      "<link rel='icon' href='/b.png' sizes=32x32 type=image/png>",
      'https://example.com/',
    )
    expect(icons).toHaveLength(1)
    expect(icons[0]).toMatchObject({
      href: 'https://example.com/b.png',
      sizes: '32x32',
      type: 'image/png',
    })
  })

  it('相对 href 相对页面 URL 解析', () => {
    const icons = parseIconLinks('<link rel="icon" href="../icon.png">', base)
    expect(icons[0]!.href).toBe('https://example.com/icon.png')
  })

  it('无 href / 空 href / 非 icon rel / 空 rel / 缺 rel 跳过', () => {
    const html = [
      '<link rel="icon">',
      '<link rel="icon" href="">',
      '<link rel="stylesheet" href="/x.css">',
      '<link rel="" href="/y.png">',
      '<link href="/z.png">',
      '<p>hello</p>',
    ].join('\n')
    expect(parseIconLinks(html, 'https://example.com/')).toHaveLength(0)
  })

  it('非法 href 与非 http(s) 跳过', () => {
    const html = '<link rel="icon" href="http://[::1"><link rel="icon" href="javascript:alert(1)">'
    expect(parseIconLinks(html, 'https://example.com/')).toHaveLength(0)
  })

  it('空 HTML 返回空数组', () => {
    expect(parseIconLinks('', 'https://example.com/')).toEqual([])
    expect(parseIconLinks('   ', 'https://example.com/')).toEqual([])
  })

  it('空 sizes/type 不保留', () => {
    const icons = parseIconLinks(
      '<link rel="icon" href="/a.png" sizes="" type="">',
      'https://example.com/',
    )
    expect(icons[0]!.sizes).toBeUndefined()
    expect(icons[0]!.type).toBeUndefined()
  })
})

describe('favicon-check / assertPageUrl', () => {
  it('合法地址返回规范化地址', () => {
    expect(assertPageUrl('https://example.com/a')).toBe('https://example.com/a')
  })
  it('空地址抛错', () => {
    expect(() => assertPageUrl('   ')).toThrow(/请输入/)
  })
  it('缺协议抛中文错', () => {
    expect(() => assertPageUrl('notaurl')).toThrow(/完整地址/)
  })
  it('非 http(s) 抛中文错', () => {
    expect(() => assertPageUrl('ftp://example.com/x')).toThrow(/仅支持/)
  })
})

describe('favicon-check / defaultCandidates', () => {
  it('返回 origin 下的 /favicon.ico', () => {
    expect(defaultCandidates('https://example.com/a/b?x=1')).toEqual([
      'https://example.com/favicon.ico',
    ])
  })
  it('非法 URL 抛中文错', () => {
    expect(() => defaultCandidates('notaurl')).toThrow(/完整地址/)
  })
})

describe('favicon-check / checkUrl', () => {
  it('HEAD 200 返回 ok', async () => {
    const r = await checkUrl(
      'https://example.com/favicon.ico',
      mockFetch(() => mockResponse(200, 'image/x-icon')),
    )
    expect(r).toMatchObject({
      url: 'https://example.com/favicon.ico',
      ok: true,
      status: 200,
      contentType: 'image/x-icon',
      note: '可访问',
    })
  })

  it('省略 fetchFn 时走全局 fetch', async () => {
    vi.stubGlobal('fetch', mockFetch(() => mockResponse(200, 'image/x-icon')))
    const r = await checkUrl('https://example.com/favicon.ico')
    expect(r.ok).toBe(true)
  })

  it('HEAD 405 回退 GET', async () => {
    const methods: Array<string | undefined> = []
    const r = await checkUrl(
      'https://example.com/favicon.ico',
      mockFetch((_url, init) => {
        methods.push(init?.method)
        return mockResponse(init?.method === 'HEAD' ? 405 : 200, 'image/x-icon')
      }),
    )
    expect(methods).toEqual(['HEAD', 'GET'])
    expect(r.ok).toBe(true)
    expect(r.status).toBe(200)
  })

  it('HEAD 501 回退 GET', async () => {
    const r = await checkUrl(
      'https://example.com/favicon.ico',
      mockFetch((_url, init) =>
        mockResponse(init?.method === 'HEAD' ? 501 : 200, 'image/x-icon'),
      ),
    )
    expect(r.ok).toBe(true)
  })

  it('404 返回失败且不抛错', async () => {
    const r = await checkUrl(
      'https://example.com/favicon.ico',
      mockFetch(() => mockResponse(404, 'text/html')),
    )
    expect(r).toMatchObject({ ok: false, status: 404, note: 'HTTP 404' })
  })

  it('网络异常返回中文 note', async () => {
    const r = await checkUrl(
      'https://example.com/favicon.ico',
      mockFetch(() => {
        throw new TypeError('boom')
      }),
    )
    expect(r).toMatchObject({
      ok: false,
      status: null,
      contentType: null,
      note: '请求失败：boom',
    })
  })

  it('超时 abort 返回中文 note', async () => {
    const r = await checkUrl(
      'https://example.com/favicon.ico',
      mockFetch(() => {
        throw new DOMException('The operation was aborted', 'AbortError')
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.note).toContain('请求失败')
    expect(r.note).toContain('超时')
  })

  it('15 秒无响应则超时 abort（真计时器推进）', async () => {
    vi.useFakeTimers()
    try {
      const fetchFn = mockFetch((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        })
      })
      const pending = checkUrl('https://example.com/favicon.ico', fetchFn)
      await vi.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS)
      const r = await pending
      expect(r.ok).toBe(false)
      expect(r.status).toBeNull()
      expect(r.note).toContain('请求失败')
      expect(r.note).toContain('15 秒')
    } finally {
      vi.useRealTimers()
    }
  })

  it('非 Error 异常转为字符串', async () => {
    const r = await checkUrl(
      'https://example.com/favicon.ico',
      mockFetch(() => {
        throw 'plain'
      }),
    )
    expect(r.note).toBe('请求失败：plain')
  })
})

describe('favicon-check / checkFavicon', () => {
  const okFetch = mockFetch(() => mockResponse(200, 'image/x-icon'))

  it('声明去重 + 默认地址去重（声明含 favicon.ico 时不重复）', async () => {
    const seen: string[] = []
    const fetchFn = mockFetch((url) => {
      seen.push(url)
      return mockResponse(200, 'image/x-icon')
    })
    const html = [
      '<link rel="icon" href="https://example.com/favicon.ico">',
      '<link rel="icon" href="https://example.com/favicon.ico">',
      '<link rel="icon" href="/a.png">',
    ].join('\n')
    const results = await checkFavicon('https://example.com/', html, fetchFn)
    expect(seen).toEqual(['https://example.com/favicon.ico', 'https://example.com/a.png'])
    expect(results).toHaveLength(2)
    expect(results[0]!.url).toBe('https://example.com/favicon.ico')
    expect(results[1]!.url).toBe('https://example.com/a.png')
  })

  it('html 为空时只检查默认地址', async () => {
    const results = await checkFavicon('https://example.com/', '', okFetch)
    expect(results).toHaveLength(1)
    expect(results[0]!.url).toBe('https://example.com/favicon.ico')
  })

  it('非法 pageUrl 抛错且不发请求', async () => {
    const fetchFn = vi.fn(mockFetch(() => mockResponse(200)))
    await expect(checkFavicon('notaurl', '', fetchFn)).rejects.toThrow(/完整地址/)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('省略 fetchFn 时走全局 fetch', async () => {
    vi.stubGlobal('fetch', okFetch)
    const results = await checkFavicon('https://example.com/', '')
    expect(results).toHaveLength(1)
    expect(results[0]!.ok).toBe(true)
  })
})

describe('favicon-check / sourceLabel', () => {
  it('未声明返回默认地址', () => {
    expect(sourceLabel('https://example.com/favicon.ico', [])).toBe('默认地址')
  })
  it('声明返回 rel/sizes/type', () => {
    const icons: IconLink[] = [
      { href: 'https://example.com/a.png', rel: 'icon', sizes: '32x32', type: 'image/png' },
    ]
    expect(sourceLabel('https://example.com/a.png', icons)).toBe(
      '声明：rel="icon" sizes="32x32" type="image/png"',
    )
  })
  it('无 sizes/type 时省略', () => {
    const icons: IconLink[] = [
      { href: 'https://example.com/c.png', rel: 'apple-touch-icon' },
    ]
    expect(sourceLabel('https://example.com/c.png', icons)).toBe(
      '声明：rel="apple-touch-icon"',
    )
  })
})

describe('favicon-check / buildSuggestions', () => {
  it('无声明建议添加', () => {
    expect(buildSuggestions([okResult], []).join('\n')).toContain('添加')
  })
  it('有声明但无 apple-touch-icon 建议补充', () => {
    const icons: IconLink[] = [{ href: 'https://example.com/a.png', rel: 'icon' }]
    expect(buildSuggestions([okResult], icons).join('\n')).toContain('apple-touch-icon')
  })
  it('有 apple-touch-icon 且全通过', () => {
    const icons: IconLink[] = [{ href: 'https://example.com/c.png', rel: 'apple-touch-icon' }]
    const tips = buildSuggestions([okResult], icons)
    expect(tips.join('\n')).toContain('均通过')
    expect(tips.join('\n')).not.toContain('缺少 apple-touch-icon')
  })
  it('有失败项提示 CORS 误报', () => {
    const icons: IconLink[] = [{ href: 'https://example.com/c.png', rel: 'apple-touch-icon' }]
    expect(buildSuggestions([failResult], icons).join('\n')).toContain('CORS')
  })
})

describe('favicon-check / renderReport', () => {
  it('无声明 + 未提供 HTML：注明仅检查默认地址并建议添加', () => {
    const out = renderReport([okResult], [], { htmlProvided: false })
    expect(out).toContain('未提供页面 HTML，仅检查默认地址')
    expect(out).toContain('声明的图标（0）')
    expect(out).toContain('（无）')
    expect(out).toContain('[OK] https://example.com/favicon.ico (200, image/x-icon)')
    expect(out).toContain('添加')
  })

  it('options 省略时同样注明未提供 HTML', () => {
    expect(renderReport([okResult], [])).toContain('未提供页面 HTML')
  })

  it('声明清单展示 rel/sizes/type 且去重', () => {
    const icons: IconLink[] = [
      {
        href: 'https://example.com/a.png',
        rel: 'icon',
        sizes: '32x32',
        type: 'image/png',
      },
      { href: 'https://example.com/a.png', rel: 'icon', sizes: '32x32', type: 'image/png' },
      { href: 'https://example.com/c.png', rel: 'apple-touch-icon' },
    ]
    const out = renderReport([okResult], icons, { htmlProvided: true })
    expect(out).toContain('声明的图标（2）')
    expect(out).toContain('rel="icon" sizes="32x32" type="image/png"')
    expect(out).toContain('https://example.com/c.png')
    expect(out).not.toContain('未提供页面 HTML')
  })

  it('失败行格式', () => {
    const out = renderReport([failResult], [], { htmlProvided: true })
    expect(out).toContain('[失败] https://example.com/favicon.ico（无响应，请求失败：boom）')
  })

  it('ok 但无 contentType 显示未知类型', () => {
    const r: CheckResult = { ...okResult, contentType: null }
    const out = renderReport([r], [], { htmlProvided: true })
    expect(out).toContain('[OK] https://example.com/favicon.ico (200, 未知类型)')
  })

  it('有 apple-touch-icon 不建议补充', () => {
    const icons: IconLink[] = [{ href: 'https://example.com/c.png', rel: 'apple-touch-icon' }]
    const out = renderReport([okResult], icons, { htmlProvided: true })
    expect(out).not.toContain('缺少 apple-touch-icon')
  })
})

describe('favicon-check / transform', () => {
  const okFetch = mockFetch(() => mockResponse(200, 'image/x-icon'))

  it('空 URL 抛错', async () => {
    await expect(transform({ text: '   ' }, { html: '' }, okFetch)).rejects.toThrow(/请输入/)
  })
  it('超长输入抛错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, { html: '' }, okFetch)).rejects.toThrow(
      /上限/,
    )
  })
  it('非法 URL 抛错', async () => {
    await expect(transform({ text: 'notaurl' }, { html: '' }, okFetch)).rejects.toThrow(
      /完整地址/,
    )
  })
  it('正常返回报告', async () => {
    const out = await transform({ text: 'https://example.com' }, { html: '' }, okFetch)
    expect(out).toContain('[OK] https://example.com/favicon.ico (200, image/x-icon)')
    expect(out).toContain('未提供页面 HTML')
  })
  it('options.html 缺省时视为未提供 HTML', async () => {
    const out = await transform(
      { text: 'https://example.com' },
      {} as FaviconCheckOptions,
      okFetch,
    )
    expect(out).toContain('未提供页面 HTML')
  })
  it('省略 fetchFn 时走全局 fetch', async () => {
    vi.stubGlobal('fetch', okFetch)
    const out = await transform({ text: 'https://example.com' }, { html: '' })
    expect(out).toContain('[OK] https://example.com/favicon.ico')
  })
  it('带声明 HTML 时报告含声明清单', async () => {
    const html = '<link rel="icon" href="/a.png"><link rel="apple-touch-icon" href="/c.png">'
    const out = await transform({ text: 'https://example.com' }, { html }, okFetch)
    expect(out).toContain('声明的图标（2）')
    expect(out).toContain('[OK] https://example.com/a.png (200, image/x-icon)')
    expect(out).not.toContain('未提供页面 HTML')
  })
})
