import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MobileFriendlyOptions } from './schema'
import type { FetchFn } from './utils'
import {
  analyzeMobileFriendly,
  fetchHtml,
  renderReport,
  transform,
  validateUrl,
} from './utils'

afterEach(() => {
  vi.unstubAllGlobals()
})

const paste: MobileFriendlyOptions = { mode: '粘贴分析' }
const fetchMode: MobileFriendlyOptions = { mode: '实时抓取' }

const GOOD_HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>@media (max-width:600px){.a{width:100%}}</style>
</head><body><p>hi</p></body></html>`

describe('mobile-friendly / analyzeMobileFriendly', () => {
  it('全通过：100 分', () => {
    const r = analyzeMobileFriendly(GOOD_HTML)
    expect(r.score).toBe(100)
    expect(r.findings).toHaveLength(4)
    expect(r.findings.every((f) => f.status === '通过')).toBe(true)
    expect(r.summary).toContain('移动友好')
  })

  it('缺 viewport：问题（-25）', () => {
    const r = analyzeMobileFriendly('<html><head></head><body></body></html>')
    const v = r.findings.find((f) => f.item === 'viewport')
    expect(v?.status).toBe('问题')
    expect(v?.advice).toContain('meta name="viewport"')
    expect(r.score).toBe(65) // -25 viewport，-10 media
  })

  it('viewport 无 device-width：建议', () => {
    const r = analyzeMobileFriendly(
      '<html><head><meta name="viewport" content="width=1024"></head><body></body></html>',
    )
    const v = r.findings.find((f) => f.item === 'viewport')
    expect(v?.status).toBe('建议')
    expect(v?.detail).toContain('width=1024')
  })

  it('viewport 标签无 content 属性：问题', () => {
    const r = analyzeMobileFriendly('<html><head><meta name="viewport"></head><body></body></html>')
    const f = r.findings.find((x) => x.item === 'viewport')
    expect(f?.status).toBe('问题')
    expect(f?.detail).toContain('content')
  })

  it('固定像素宽度：问题（小尺寸不计入）', () => {
    const r = analyzeMobileFriendly(
      '<html><head><meta name="viewport" content="width=device-width"></head><body><div style="width:960px"></div><span style="width:50px"></span></body></html>',
    )
    const w = r.findings.find((f) => f.item === '固定宽度')
    expect(w?.status).toBe('问题')
    expect(w?.detail).toContain('1 处')
    expect(w?.detail).toContain('960')
  })

  it('table：建议', () => {
    const r = analyzeMobileFriendly(
      '<html><head><meta name="viewport" content="width=device-width"></head><body><table><tr><td>x</td></tr></table></body></html>',
    )
    const t = r.findings.find((f) => f.item === '表格布局')
    expect(t?.status).toBe('建议')
    expect(t?.advice).toContain('overflow-x')
  })

  it('多问题：低分结论', () => {
    const r = analyzeMobileFriendly(
      '<html><body><div style="width:1200px"></div></body></html>',
    )
    expect(r.score).toBe(40) // -25 viewport，-25 固定宽度，-10 media
    expect(r.summary).toContain('移动体验较差')
  })

  it('仅建议项：中等结论', () => {
    const r = analyzeMobileFriendly(
      '<html><head><meta name="viewport" content="width=device-width"></head><body></body></html>',
    )
    expect(r.score).toBe(90)
    expect(r.summary).toContain('移动友好')
  })

  it('70-89 分：基本可用结论', () => {
    const r = analyzeMobileFriendly(
      '<html><head><meta name="viewport" content="width=device-width"></head><body><table></table></body></html>',
    )
    expect(r.score).toBe(80)
    expect(r.summary).toContain('基本可用')
  })
})

describe('mobile-friendly / validateUrl', () => {
  it('空/非法/非 http(s) 报错', () => {
    expect(() => validateUrl('  ')).toThrow(/请输入/)
    expect(() => validateUrl('nope')).toThrow(/格式不正确/)
    expect(() => validateUrl('ftp://a.com/')).toThrow(/只支持 http/)
  })
  it('合法返回规范化 href', () => {
    expect(validateUrl('https://a.com')).toBe('https://a.com/')
  })
})

describe('mobile-friendly / fetchHtml', () => {
  const okFetch: FetchFn = async () =>
    new Response(GOOD_HTML, { status: 200, headers: { 'content-type': 'text/html' } })

  it('成功返回 HTML', async () => {
    await expect(fetchHtml('https://x.test/', okFetch, 1000)).resolves.toContain('viewport')
  })

  it('URL 非法直接抛错', async () => {
    await expect(fetchHtml('nope', okFetch)).rejects.toThrow(/格式不正确/)
  })

  it('超时抛中文错', async () => {
    const hanging: FetchFn = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        )
      })
    await expect(fetchHtml('https://x.test/', hanging, 20)).rejects.toThrow(/超时/)
  })

  it('网络失败给 CORS 提示', async () => {
    const bad: FetchFn = async () => {
      throw new Error('Failed to fetch')
    }
    await expect(fetchHtml('https://x.test/', bad)).rejects.toThrow(/CORS/)
  })

  it('DOMException 非 Abort 也给 CORS 提示', async () => {
    const bad: FetchFn = async () => {
      throw new DOMException('denied', 'SecurityError')
    }
    await expect(fetchHtml('https://x.test/', bad)).rejects.toThrow(/CORS/)
  })

  it('非 2xx 抛错', async () => {
    const nf: FetchFn = async () => new Response('nope', { status: 404 })
    await expect(fetchHtml('https://x.test/', nf)).rejects.toThrow(/HTTP 404/)
  })

  it('页面过大抛错', async () => {
    const big: FetchFn = async () => new Response('x'.repeat(2000001), { status: 200 })
    await expect(fetchHtml('https://x.test/', big)).rejects.toThrow(/过大/)
  })

  it('默认参数走默认 fetch（stub 全局 fetch）', async () => {
    vi.stubGlobal('fetch', okFetch as unknown as typeof fetch)
    await expect(fetchHtml('https://x.test/')).resolves.toContain('viewport')
  })
})

describe('mobile-friendly / renderReport', () => {
  it('渲染得分与 findings（含建议行）', () => {
    const out = renderReport(analyzeMobileFriendly('<html><body></body></html>'), '粘贴的 HTML')
    expect(out).toContain('移动友好得分：65 / 100')
    expect(out).toContain('[问题] viewport')
    expect(out).toContain('建议：')
  })

  it('通过项不渲染建议行', () => {
    const out = renderReport(analyzeMobileFriendly(GOOD_HTML), '粘贴的 HTML')
    const adviceLines = out.split('\n').filter((l) => l.startsWith('  建议：'))
    expect(adviceLines).toHaveLength(0)
  })
})

describe('mobile-friendly / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '   ' }, paste)).resolves.toBe('')
  })
  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(2000001) }, paste)).rejects.toThrow(/上限/)
  })
  it('粘贴模式直接分析', async () => {
    const out = await transform({ text: GOOD_HTML }, paste)
    expect(out).toContain('移动友好得分：100 / 100')
    expect(out).toContain('来源：粘贴的 HTML')
  })
  it('实时抓取模式', async () => {
    const mock: FetchFn = async () => new Response(GOOD_HTML, { status: 200 })
    const out = await transform({ text: 'https://x.test/' }, fetchMode, mock)
    expect(out).toContain('来源：实时抓取：https://x.test/')
    expect(out).toContain('100 / 100')
  })
  it('实时抓取 URL 非法抛错', async () => {
    const mock: FetchFn = async () => new Response(GOOD_HTML, { status: 200 })
    await expect(transform({ text: 'nope' }, fetchMode, mock)).rejects.toThrow(/格式不正确/)
  })
  it('实时抓取默认 fetch（stub 全局 fetch）', async () => {
    vi.stubGlobal(
      'fetch',
      (async () => new Response(GOOD_HTML, { status: 200 })) as unknown as typeof fetch,
    )
    const out = await transform({ text: 'https://x.test/' }, fetchMode)
    expect(out).toContain('100 / 100')
  })
})
