import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuditItem } from './utils'
import { auditHtml, fetchHtml, renderResult, scoreAudit, transform } from './utils'

afterEach(() => {
  vi.useRealTimers()
})

/** 11 项全部通过的页面 */
const GOOD_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>一个长度合适的页面标题示例</title>
<meta name="description" content="这是一个长度合适的页面描述，用于测试 SEO 审计工具的通过分支。">
<link rel="canonical" href="https://example.com/">
<link rel="alternate" hreflang="en" href="https://example.com/en/">
<meta property="og:title" content="示例">
<meta property="og:description" content="示例描述">
<meta property="og:image" content="https://example.com/og.png">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head>
<body>
<h1>主标题</h1>
<img src="a.png" alt="图片一">
</body>
</html>`

/** 各项多为问题/警告的页面 */
const BAD_HTML = `<head>
<title>短</title>
<meta name="description" content="${'描'.repeat(200)}">
<meta charset="utf-8">
<link rel="stylesheet" href="s.css">
<link rel="alternate" type="application/rss+xml" href="/feed.xml">
<script src="a.js"></script>
<script type="text/javascript">var a=1;</script>
</head>
<body>
<h1>一</h1>
<h1>二</h1>
<img src="a.png">
<img src="b.png" alt="">
<img src="c.png" alt="   ">
</body>`

function itemOf(result: { items: AuditItem[] }, check: string): AuditItem {
  const found = result.items.find((i) => i.check === check)
  if (!found) throw new Error(`缺少检查项 ${check}`)
  return found
}

function mockResponse(opts: {
  ok?: boolean
  status?: number
  contentType?: string
  body?: string
}): Response {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: { get: () => opts.contentType ?? null },
    text: async () => opts.body ?? '<html></html>',
  } as unknown as Response
}

function mockFetch(res: Response): typeof fetch {
  return (async () => res) as unknown as typeof fetch
}

describe('seo-audit / auditHtml', () => {
  it('全优页面 11 项全部通过、满分 100', () => {
    const result = auditHtml(GOOD_HTML)
    expect(result.items).toHaveLength(11)
    for (const item of result.items) expect(item.status).toBe('通过')
    expect(result.score).toBe(100)
  })

  it('问题页面逐项状态符合预期', () => {
    const result = auditHtml(BAD_HTML, 'https://example.com/bad')
    expect(itemOf(result, 'title 标签').status).toBe('问题')
    expect(itemOf(result, 'title 标签').detail).toContain('过短')
    expect(itemOf(result, 'meta description').status).toBe('警告')
    expect(itemOf(result, 'meta description').detail).toContain('过长')
    expect(itemOf(result, 'canonical 链接').status).toBe('警告')
    expect(itemOf(result, 'canonical 链接').detail).toContain('页面：https://example.com/bad')
    expect(itemOf(result, 'Open Graph 标签').status).toBe('警告')
    expect(itemOf(result, 'Open Graph 标签').detail).toContain('og:title、og:description、og:image')
    expect(itemOf(result, 'Twitter Card').status).toBe('警告')
    expect(itemOf(result, 'hreflang 链接').status).toBe('警告')
    expect(itemOf(result, 'h1 标题').status).toBe('警告')
    expect(itemOf(result, 'h1 标题').detail).toContain('2 个')
    expect(itemOf(result, '图片 alt').status).toBe('警告')
    expect(itemOf(result, '图片 alt').detail).toContain('3 张图片中有 3 张缺少 alt')
    expect(itemOf(result, 'viewport meta').status).toBe('问题')
    expect(itemOf(result, 'JSON-LD 结构化数据').status).toBe('警告')
    expect(itemOf(result, '<html lang>').status).toBe('警告')
    // 0 通过 + 9 警告：100 * 4.5 / 11 = 40.9 → 41
    expect(result.score).toBe(41)
  })

  it('title 缺失为问题；长度边界 9/10/60/61 字符', () => {
    expect(itemOf(auditHtml('<p>无标题</p>'), 'title 标签').status).toBe('问题')
    expect(itemOf(auditHtml('<p>无标题</p>'), 'title 标签').detail).toContain('缺少')
    expect(itemOf(auditHtml('<title>一二三四五六七八九</title>'), 'title 标签').status).toBe('问题')
    expect(itemOf(auditHtml('<title>一二三四五六七八九十</title>'), 'title 标签').status).toBe('通过')
    expect(itemOf(auditHtml(`<title>${'十'.repeat(60)}</title>`), 'title 标签').status).toBe('通过')
    expect(itemOf(auditHtml(`<title>${'十'.repeat(61)}</title>`), 'title 标签').status).toBe('警告')
  })

  it('title 标签大小写不敏感、空白不计入长度', () => {
    const result = auditHtml('<HEAD><TITLE>\n  一二三四五六七八九十  \n</TITLE></HEAD>')
    expect(itemOf(result, 'title 标签').status).toBe('通过')
    expect(itemOf(result, 'title 标签').detail).toContain('10 个字符')
  })

  it('description 缺失为问题；160/161 字符边界', () => {
    expect(itemOf(auditHtml('<p>x</p>'), 'meta description').status).toBe('问题')
    const ok = '描'.repeat(160)
    expect(itemOf(auditHtml(`<meta name="description" content="${ok}">`), 'meta description').status).toBe('通过')
    const long = '描'.repeat(161)
    expect(itemOf(auditHtml(`<meta name="description" content="${long}">`), 'meta description').status).toBe('警告')
  })

  it('meta 属性支持单引号、无引号与大小写不敏感', () => {
    const html = `<META NAME='description' CONTENT='单引号描述'><img src=a.png alt=x>`
    const result = auditHtml(html)
    expect(itemOf(result, 'meta description').status).toBe('通过')
    expect(itemOf(result, '图片 alt').status).toBe('通过')
  })

  it('meta 命中但无 content 时视为空描述', () => {
    const result = auditHtml('<meta name="description">')
    const item = itemOf(result, 'meta description')
    expect(item.status).toBe('通过')
  })

  it('canonical 缺失且无 pageUrl 时不带页面后缀', () => {
    const result = auditHtml('<p>x</p>')
    expect(itemOf(result, 'canonical 链接').detail).toBe('缺少 canonical 链接')
  })

  it('link 变体：无 rel、无 href、属性顺序颠倒都能正确处理', () => {
    // 无 rel 的 link 应被跳过 → 仍报缺失
    expect(itemOf(auditHtml('<link href="https://example.com/x">'), 'canonical 链接').status).toBe('警告')
    // 有 rel 无 href → 仍报缺失
    expect(itemOf(auditHtml('<link rel="canonical">'), 'canonical 链接').status).toBe('警告')
    // 属性顺序颠倒 + 大小写混写仍能命中
    const html = '<LINK HREF="https://example.com/" REL="canonical">'
    const item = itemOf(auditHtml(html), 'canonical 链接')
    expect(item.status).toBe('通过')
    expect(item.detail).toContain('https://example.com/')
  })

  it('og 缺其中一个时注明缺哪个', () => {
    const html = '<meta property="og:title" content="t"><meta property="og:image" content="i">'
    const item = itemOf(auditHtml(html), 'Open Graph 标签')
    expect(item.status).toBe('警告')
    expect(item.detail).toBe('缺少 og:description')
  })

  it('hreflang 大小写混写仍能命中', () => {
    const html = '<LINK REL="ALTERNATE" HREFLANG="en" HREF="https://example.com/en/">'
    const item = itemOf(auditHtml(html), 'hreflang 链接')
    expect(item.status).toBe('通过')
    expect(item.detail).toContain('en')
  })

  it('h1 缺失为问题、单个为通过', () => {
    expect(itemOf(auditHtml('<p>无 h1</p>'), 'h1 标题').status).toBe('问题')
    expect(itemOf(auditHtml('<h1>唯一</h1>'), 'h1 标题').status).toBe('通过')
  })

  it('无 img 时 alt 检查直接通过', () => {
    const item = itemOf(auditHtml('<p>无图</p>'), '图片 alt')
    expect(item.status).toBe('通过')
    expect(item.detail).toContain('没有 <img>')
  })

  it('viewport 缺失为问题', () => {
    expect(itemOf(auditHtml('<p>x</p>'), 'viewport meta').status).toBe('问题')
    expect(itemOf(auditHtml('<meta name="viewport" content="width=device-width">'), 'viewport meta').status).toBe('通过')
  })

  it('JSON-LD 单引号 type 也能命中', () => {
    const item = itemOf(auditHtml(`<script type='application/ld+json'>{}</script>`), 'JSON-LD 结构化数据')
    expect(item.status).toBe('通过')
  })

  it('html lang 为空字符串视作缺失', () => {
    expect(itemOf(auditHtml('<html lang="">'), '<html lang>').status).toBe('警告')
    const item = itemOf(auditHtml('<html lang="en">'), '<html lang>')
    expect(item.status).toBe('通过')
    expect(item.detail).toContain('lang="en"')
  })
})

describe('seo-audit / scoreAudit', () => {
  const mk = (status: AuditItem['status']): AuditItem => ({ check: 'x', status, detail: 'y' })

  it('空数组返回 0', () => {
    expect(scoreAudit([])).toBe(0)
  })

  it('全通过 100、全问题 0', () => {
    expect(scoreAudit([mk('通过'), mk('通过')])).toBe(100)
    expect(scoreAudit([mk('问题'), mk('问题')])).toBe(0)
  })

  it('警告按 0.5 计分并四舍五入', () => {
    // 1 警告 / 3 项：100 * 0.5 / 3 = 16.67 → 17
    expect(scoreAudit([mk('警告'), mk('问题'), mk('问题')])).toBe(17)
    // 1 通过 1 警告：100 * 1.5 / 2 = 75
    expect(scoreAudit([mk('通过'), mk('警告')])).toBe(75)
  })
})

describe('seo-audit / fetchHtml', () => {
  it('成功抓取返回 HTML 文本', async () => {
    const html = await fetchHtml(
      'https://example.com',
      mockFetch(mockResponse({ contentType: 'text/html; charset=utf-8', body: '<title>t</title>' })),
    )
    expect(html).toBe('<title>t</title>')
  })

  it('URL 前后空白会被裁掉', async () => {
    const seen: string[] = []
    const fn = (async (url: string) => {
      seen.push(url)
      return mockResponse({ contentType: 'text/html' })
    }) as unknown as typeof fetch
    await fetchHtml('  https://example.com/a  ', fn)
    expect(seen[0]).toBe('https://example.com/a')
  })

  it('非法 URL 抛中文错', async () => {
    await expect(fetchHtml('not-a-url', mockFetch(mockResponse({})))).rejects.toThrow(/http/)
    await expect(fetchHtml('ftp://example.com', mockFetch(mockResponse({})))).rejects.toThrow(/http/)
    await expect(fetchHtml('', mockFetch(mockResponse({})))).rejects.toThrow(/http/)
  })

  it('非 2xx 抛 HTTP 状态码', async () => {
    await expect(
      fetchHtml('https://example.com/404', mockFetch(mockResponse({ ok: false, status: 404 }))),
    ).rejects.toThrow('抓取失败：HTTP 404')
  })

  it('非 HTML content-type 拒绝', async () => {
    await expect(
      fetchHtml(
        'https://example.com/a.json',
        mockFetch(mockResponse({ contentType: 'application/json' })),
      ),
    ).rejects.toThrow(/不是 HTML 页面/)
  })

  it('缺 content-type 时提示未知', async () => {
    await expect(
      fetchHtml('https://example.com/x', mockFetch(mockResponse({}))),
    ).rejects.toThrow('未知')
  })

  it('网络异常抛中文错并提示 CORS', async () => {
    const boom = (async () => {
      throw new Error('boom')
    }) as unknown as typeof fetch
    await expect(fetchHtml('https://example.com', boom)).rejects.toThrow(/未开放 CORS/)
  })

  it('网络异常抛非 Error 值也能处理', async () => {
    const boom = (async () => {
      throw '纯字符串异常'
    }) as unknown as typeof fetch
    await expect(fetchHtml('https://example.com', boom)).rejects.toThrow(/纯字符串异常/)
  })

  it('15 秒超时抛超时错', async () => {
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
})

describe('seo-audit / renderResult', () => {
  it('渲染总分与逐项行', () => {
    const out = renderResult({
      score: 85,
      items: [
        { check: 'title 标签', status: '通过', detail: '长度合适' },
        { check: 'h1 标题', status: '警告', detail: '有 2 个' },
      ],
    })
    expect(out).toBe('总分：85/100\n[通过] title 标签：长度合适\n[警告] h1 标题：有 2 个')
  })

  it('空检查项只渲染总分行', () => {
    expect(renderResult({ score: 0, items: [] })).toBe('总分：0/100')
  })
})

describe('seo-audit / transform', () => {
  it('空输入抛中文错', async () => {
    await expect(transform({ text: '   ' }, { mode: 'paste' })).rejects.toThrow(/URL|HTML/)
  })

  it('paste 模式直接审计 HTML', async () => {
    const out = await transform({ text: GOOD_HTML }, { mode: 'paste' })
    expect(out).toContain('总分：100/100')
    expect(out).toContain('[通过] title 标签')
  })

  it('fetch 模式先抓取再审计', async () => {
    const out = await transform(
      { text: 'https://example.com' },
      { mode: 'fetch' },
      mockFetch(mockResponse({ contentType: 'text/html', body: GOOD_HTML })),
    )
    expect(out).toContain('总分：100/100')
  })

  it('fetch 模式非法 URL 在抓取前抛错', async () => {
    await expect(
      transform({ text: 'notaurl' }, { mode: 'fetch' }, mockFetch(mockResponse({}))),
    ).rejects.toThrow(/http/)
  })
})
