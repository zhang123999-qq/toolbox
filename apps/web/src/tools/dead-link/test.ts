import { describe, expect, it } from 'vitest'
import { MAX_URLS } from './schema'
import {
  DeadLinkError,
  checkBatch,
  checkUrl,
  errorMessage,
  parseUrlList,
  renderReport,
  summarize,
  toInvalidResult,
} from './utils'
import type { DeadLinkResult, FetchFn } from './utils'

const ok200: FetchFn = () => Promise.resolve(new Response('', { status: 200 }))

describe('dead-link / parseUrlList', () => {
  it('空输入报错', () => {
    expect(() => parseUrlList('   ')).toThrow(DeadLinkError)
    expect(() => parseUrlList('   ')).toThrow(/每行一个/)
  })
  it('超长输入报错', () => {
    expect(() => parseUrlList('x'.repeat(200001))).toThrow(/上限/)
  })
  it('超过 200 行报错', () => {
    const text = Array.from({ length: MAX_URLS + 1 }, (_, i) => `https://x${i}.com/`).join('\n')
    expect(() => parseUrlList(text)).toThrow(/200/)
  })
  it('解析有效 URL 并去重', () => {
    const p = parseUrlList('https://a.com/\nhttps://b.com/x\nhttps://a.com/\n')
    expect(p.urls).toEqual(['https://a.com/', 'https://b.com/x'])
    expect(p.duplicates).toBe(1)
    expect(p.invalid).toEqual([])
  })
  it('非法行收集原因与行号', () => {
    const p = parseUrlList('https://ok.com/\nnot a url\nftp://x.com/f\n')
    expect(p.urls).toEqual(['https://ok.com/'])
    expect(p.invalid).toHaveLength(2)
    expect(p.invalid[0]).toMatchObject({ line: 2, reason: 'URL 格式不正确' })
    expect(p.invalid[1]).toMatchObject({ line: 3, reason: '不支持的协议：ftp:' })
  })
  it('空行被忽略', () => {
    const p = parseUrlList('\nhttps://a.com/\n\n')
    expect(p.urls).toEqual(['https://a.com/'])
  })
  it('恰好 200 行通过', () => {
    const text = Array.from({ length: MAX_URLS }, (_, i) => `https://x${i}.com/`).join('\n')
    expect(parseUrlList(text).urls).toHaveLength(MAX_URLS)
  })
})

describe('dead-link / toInvalidResult', () => {
  it('转为无效结果项', () => {
    const r = toInvalidResult({ line: 2, value: 'nope', reason: 'URL 格式不正确' })
    expect(r).toMatchObject({ url: 'nope', status: '无效', httpStatus: null, alive: false, ms: 0 })
    expect(r.note).toContain('第 2 行')
  })
})

describe('dead-link / errorMessage', () => {
  it('Error 取 message，非 Error 转字符串', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('raw')).toBe('raw')
  })
})

describe('dead-link / checkUrl', () => {
  it('200 → 存活，301 → 重定向，404/500 → 死链', async () => {
    for (const [status, expected, alive] of [
      [200, '存活', true],
      [301, '重定向', true],
      [404, '死链', false],
      [500, '死链', false],
    ] as const) {
      const f: FetchFn = () => Promise.resolve(new Response('', { status }))
      const r = await checkUrl('https://example.com/', f)
      expect(r.status).toBe(expected)
      expect(r.alive).toBe(alive)
      expect(r.httpStatus).toBe(status)
    }
  })
  it('HEAD 405 回退 GET', async () => {
    const calls: string[] = []
    const f: FetchFn = (_url, init) => {
      calls.push(init?.method ?? 'GET')
      return Promise.resolve(new Response('', { status: init?.method === 'HEAD' ? 405 : 200 }))
    }
    const r = await checkUrl('https://example.com/', f)
    expect(r.status).toBe('存活')
    expect(calls).toEqual(['HEAD', 'GET'])
  })
  it('HEAD 501 回退 GET', async () => {
    const f: FetchFn = (_url, init) =>
      Promise.resolve(new Response('', { status: init?.method === 'HEAD' ? 501 : 404 }))
    expect((await checkUrl('https://example.com/', f)).status).toBe('死链')
  })
  it('超时 → 超时状态', async () => {
    const f: FetchFn = (_url, init) =>
      new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
      })
    const r = await checkUrl('https://example.com/', f, 20)
    expect(r.status).toBe('超时')
    expect(r.alive).toBe(false)
  })
  it('网络失败 → 错误状态', async () => {
    const f: FetchFn = () => Promise.reject(new Error('boom'))
    const r = await checkUrl('https://example.com/', f)
    expect(r.status).toBe('错误')
    expect(r.note).toContain('boom')
  })
  it('网络失败（非 Error）→ 错误状态', async () => {
    const f: FetchFn = () => Promise.reject('nope')
    const r = await checkUrl('https://example.com/', f)
    expect(r.status).toBe('错误')
    expect(r.note).toContain('nope')
  })
})

describe('dead-link / checkBatch', () => {
  it('保持顺序并报告进度', async () => {
    const urls = ['https://a.com/', 'https://b.com/']
    const progress: Array<[number, number]> = []
    const results = await checkBatch(urls, ok200, {
      onProgress: (done, total) => progress.push([done, total]),
    })
    expect(results.map((r) => r.url)).toEqual(urls)
    expect(results.every((r) => r.status === '存活')).toBe(true)
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
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
    const urls = Array.from({ length: 8 }, (_, i) => `https://x${i}.com/`)
    await checkBatch(urls, f, { concurrency: 3 })
    expect(maxActive).toBe(3)
  })
  it('空数组直接返回', async () => {
    await expect(checkBatch([], ok200)).resolves.toEqual([])
  })
})

describe('dead-link / summarize + renderReport', () => {
  const results: DeadLinkResult[] = [
    { url: 'https://a.com/', status: '存活', httpStatus: 200, alive: true, note: '', ms: 1 },
    { url: 'https://b.com/', status: '重定向', httpStatus: 301, alive: true, note: '', ms: 1 },
    { url: 'https://c.com/', status: '死链', httpStatus: 404, alive: false, note: 'HTTP 404', ms: 1 },
    { url: 'https://d.com/', status: '超时', httpStatus: null, alive: false, note: '超时', ms: 1 },
    { url: 'https://e.com/', status: '错误', httpStatus: null, alive: false, note: '错', ms: 1 },
    { url: 'nope', status: '无效', httpStatus: null, alive: false, note: '第 6 行：URL 格式不正确', ms: 0 },
  ]
  it('汇总计数与存活率', () => {
    const s = summarize(results)
    expect(s).toMatchObject({ total: 6, alive: 1, redirect: 1, dead: 1, timeout: 1, error: 1, invalid: 1 })
    expect(s.aliveRate).toBeCloseTo(2 / 6)
  })
  it('空结果存活率为 1', () => {
    expect(summarize([]).aliveRate).toBe(1)
  })
  it('报告包含死链清单与无效清单', () => {
    const report = renderReport(results)
    expect(report).toContain('存活率 33%')
    expect(report).toContain('死链清单')
    expect(report).toContain('[死链] https://c.com/')
    expect(report).toContain('格式无效')
    expect(report).toContain('明细')
  })
  it('全存活时无死链清单', () => {
    const report = renderReport([results[0]])
    expect(report).not.toContain('死链清单')
    expect(report).not.toContain('格式无效')
  })
})
