import { describe, expect, it } from 'vitest'
import {
  LinkCheckError,
  checkLink,
  checkLinks,
  errorMessage,
  extractLinks,
  fetchPageHtml,
  renderReport,
  summarize,
  validateUrl,
} from './utils'
import type { FetchFn, PageLink } from './utils'

const ok200: FetchFn = () => Promise.resolve(new Response('', { status: 200 }))

const link = (url: string, category: PageLink['category'] = '站外', skipReason = ''): PageLink => ({
  url,
  text: 't',
  category,
  skipReason,
})

describe('link-check / validateUrl', () => {
  it('空/格式错/非 http(s) 报错', () => {
    expect(() => validateUrl('')).toThrow(/请输入/)
    expect(() => validateUrl('not a url')).toThrow(/格式/)
    expect(() => validateUrl('ftp://x.com/f')).toThrow(/只支持 http/)
  })
  it('合法 URL 返回规范化 href', () => {
    expect(validateUrl('https://example.com')).toBe('https://example.com/')
  })
})

describe('link-check / errorMessage', () => {
  it('Error 取 message，非 Error 转字符串', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('raw')).toBe('raw')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('link-check / extractLinks', () => {
  const base = 'https://example.com/dir/page.html'
  it('提取并分类站内/站外', () => {
    const links = extractLinks('<a href="/a">A</a><a href="https://other.com/b">B</a>', base)
    expect(links).toEqual([
      { url: 'https://example.com/a', text: 'A', category: '站内', skipReason: '' },
      { url: 'https://other.com/b', text: 'B', category: '站外', skipReason: '' },
    ])
  })
  it('相对地址与协议相对地址解析', () => {
    const links = extractLinks('<a href="../up">U</a><a href="//cdn.com/x">C</a>', base)
    expect(links[0].url).toBe('https://example.com/up')
    expect(links[1].url).toBe('https://cdn.com/x')
  })
  it('去重（保留第一条）', () => {
    const links = extractLinks('<a href="/a">一</a><a href="/a">二</a>', base)
    expect(links).toHaveLength(1)
    expect(links[0].text).toBe('一')
  })
  it('mailto/tel/javascript/锚点/空 href/无 href 跳过', () => {
    const html = [
      '<a href="mailto:a@b.com">M</a>',
      '<a href="tel:123">T</a>',
      '<a href="javascript:void(0)">J</a>',
      '<a href="#sec">F</a>',
      '<a href="">E</a>',
      '<a>无 href</a>',
    ].join('')
    const links = extractLinks(html, base)
    expect(links).toHaveLength(6)
    expect(links.every((l) => l.category === '跳过')).toBe(true)
    expect(links[0].skipReason).toContain('mailto')
    expect(links[2].skipReason).toContain('javascript')
    expect(links[3].skipReason).toContain('锚点')
  })
  it('非法 URL 与非 http 协议跳过', () => {
    const links = extractLinks('<a href="http://exa mple.com/">坏</a><a href="ftp://x.com/f">F</a>', base)
    expect(links[0].skipReason).toContain('非法')
    expect(links[1].skipReason).toContain('ftp:')
  })
  it('提取链接文本（去掉内层标签）', () => {
    const links = extractLinks('<a href="/a"><b>粗体</b> 文本</a>', base)
    expect(links[0].text).toBe('粗体 文本')
  })
  it('href 支持单引号与无引号', () => {
    const links = extractLinks(`<a href='/s'>S</a><a href=/u>U</a>`, base)
    expect(links[0].url).toBe('https://example.com/s')
    expect(links[1].url).toBe('https://example.com/u')
  })
  it('baseUrl 非法时抛错', () => {
    expect(() => extractLinks('<a href="/a">A</a>', 'nope')).toThrow(LinkCheckError)
  })
})

describe('link-check / checkLink', () => {
  it('跳过类直接返回跳过', async () => {
    const r = await checkLink(link('mailto:a@b.com', '跳过', 'mailto:/tel: 链接不检测'), ok200)
    expect(r.status).toBe('跳过')
    expect(r.httpStatus).toBe(null)
    expect(r.ms).toBe(0)
    expect(r.note).toContain('mailto')
  })
  it('200 → 正常，301 → 重定向，404/500 → 死链', async () => {
    for (const [status, expected] of [
      [200, '正常'],
      [301, '重定向'],
      [404, '死链'],
      [500, '死链'],
    ] as const) {
      const f: FetchFn = () => Promise.resolve(new Response('', { status }))
      const r = await checkLink(link('https://example.com/'), f)
      expect(r.status).toBe(expected)
      expect(r.httpStatus).toBe(status)
      expect(r.note).toContain(String(status))
    }
  })
  it('HEAD 405/501 回退 GET', async () => {
    const calls: string[] = []
    const f: FetchFn = (_url, init) => {
      calls.push(init?.method ?? 'GET')
      const status = init?.method === 'HEAD' ? 405 : 200
      return Promise.resolve(new Response('', { status }))
    }
    const r = await checkLink(link('https://example.com/'), f)
    expect(r.status).toBe('正常')
    expect(calls).toEqual(['HEAD', 'GET'])
    const f2: FetchFn = (_url, init) =>
      Promise.resolve(new Response('', { status: init?.method === 'HEAD' ? 501 : 200 }))
    expect((await checkLink(link('https://example.com/'), f2)).status).toBe('正常')
  })
  it('HEAD 正常时不回退', async () => {
    let calls = 0
    const f: FetchFn = () => {
      calls += 1
      return Promise.resolve(new Response('', { status: 200 }))
    }
    await checkLink(link('https://example.com/'), f)
    expect(calls).toBe(1)
  })
  it('超时 → 超时状态', async () => {
    const f: FetchFn = (_url, init) =>
      new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
      })
    const r = await checkLink(link('https://example.com/'), f, 20)
    expect(r.status).toBe('超时')
    expect(r.note).toContain('20')
  })
  it('网络失败 → 错误状态', async () => {
    const f: FetchFn = () => Promise.reject(new Error('boom'))
    const r = await checkLink(link('https://example.com/'), f)
    expect(r.status).toBe('错误')
    expect(r.note).toContain('boom')
  })
  it('网络失败（非 Error 对象）→ 错误状态', async () => {
    const f: FetchFn = () => Promise.reject('string failure')
    const r = await checkLink(link('https://example.com/'), f)
    expect(r.status).toBe('错误')
    expect(r.note).toContain('string failure')
  })
})

describe('link-check / checkLinks', () => {
  it('保持输入顺序并报告进度', async () => {
    const links = [link('https://a.com/'), link('https://b.com/'), link('https://c.com/')]
    const progress: Array<[number, number]> = []
    const results = await checkLinks(links, ok200, {
      onProgress: (done, total) => progress.push([done, total]),
    })
    expect(results.map((r) => r.url)).toEqual(['https://a.com/', 'https://b.com/', 'https://c.com/'])
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })
  it('并发度受限', async () => {
    let active = 0
    let maxActive = 0
    const f: FetchFn = async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active -= 1
      return new Response('', { status: 200 })
    }
    const links = Array.from({ length: 10 }, (_, i) => link(`https://x${i}.com/`))
    await checkLinks(links, f, { concurrency: 3 })
    expect(maxActive).toBe(3)
  })
  it('空数组直接返回', async () => {
    await expect(checkLinks([], ok200)).resolves.toEqual([])
  })
  it('无 onProgress 也可运行', async () => {
    const results = await checkLinks([link('https://a.com/')], ok200)
    expect(results[0].status).toBe('正常')
  })
})

describe('link-check / fetchPageHtml', () => {
  it('成功返回文本', async () => {
    const f: FetchFn = () => Promise.resolve(new Response('<html></html>', { status: 200 }))
    await expect(fetchPageHtml('https://example.com/', f)).resolves.toBe('<html></html>')
  })
  it('URL 非法先抛错', async () => {
    await expect(fetchPageHtml('nope', ok200)).rejects.toThrow(LinkCheckError)
  })
  it('HTTP 非 2xx 抛错', async () => {
    const f: FetchFn = () => Promise.resolve(new Response('x', { status: 404 }))
    await expect(fetchPageHtml('https://example.com/', f)).rejects.toThrow(/404/)
  })
  it('网络失败提示改用粘贴模式', async () => {
    const f: FetchFn = () => Promise.reject(new Error('cors'))
    await expect(fetchPageHtml('https://example.com/', f)).rejects.toThrow(/粘贴HTML/)
  })
  it('网络失败（非 Error 对象）走 String 分支', async () => {
    const f: FetchFn = () => Promise.reject('nope')
    await expect(fetchPageHtml('https://example.com/', f)).rejects.toThrow(/nope/)
  })
  it('超时抛超时错', async () => {
    const f: FetchFn = (_url, init) =>
      new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
      })
    await expect(fetchPageHtml('https://example.com/', f, 20)).rejects.toThrow(/超时/)
  })
})

describe('link-check / summarize + renderReport', () => {
  const results = [
    { url: 'https://a.com/', text: '', category: '站内', status: '正常', httpStatus: 200, note: '', ms: 1 },
    { url: 'https://b.com/', text: '', category: '站外', status: '死链', httpStatus: 404, note: 'HTTP 404', ms: 1 },
    { url: 'https://c.com/', text: '', category: '站外', status: '超时', httpStatus: null, note: '超时', ms: 1 },
  ] as const
  it('汇总计数正确', () => {
    const s = summarize(results)
    expect(s).toMatchObject({ total: 3, ok: 1, dead: 1, timeout: 1, redirect: 0, error: 0, skipped: 0 })
  })
  it('汇总覆盖全部状态', () => {
    const all = [
      { url: 'https://r.com/', text: '', category: '站外', status: '重定向', httpStatus: 301, note: '', ms: 1 },
      { url: 'https://e.com/', text: '', category: '站外', status: '错误', httpStatus: null, note: '', ms: 1 },
      { url: 'https://s.com/', text: '', category: '跳过', status: '跳过', httpStatus: null, note: '', ms: 0 },
    ] as const
    const s = summarize(all)
    expect(s).toMatchObject({ total: 3, redirect: 1, error: 1, skipped: 1 })
  })
  it('报告包含汇总与需处理清单', () => {
    const report = renderReport(results)
    expect(report).toContain('共 3 个链接')
    expect(report).toContain('需处理')
    expect(report).toContain('[死链] https://b.com/')
  })
  it('无坏链时不输出需处理', () => {
    const report = renderReport([results[0]])
    expect(report).not.toContain('需处理')
    expect(report).toContain('明细')
  })
})
