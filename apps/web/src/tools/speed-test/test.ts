import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpeedTestOptions } from './schema'
import type { FetchFn, NowFn } from './utils'
import {
  formatSize,
  isSameOrigin,
  measure,
  measureOnce,
  renderReport,
  scoreTiming,
  transform,
  validateUrl,
} from './utils'

afterEach(() => {
  vi.unstubAllGlobals()
})

const opts1: SpeedTestOptions = { times: 1 }

/** 确定性时钟：每次调用 +25ms */
function clock(): NowFn {
  let t = 1000
  return () => {
    t += 25
    return t
  }
}

function okFetch(body: BodyInit | null = 'hello'): FetchFn {
  return async () => new Response(body, { status: 200 })
}

function opaque(): Response {
  return { type: 'opaque', status: 0, headers: new Headers(), body: null } as unknown as Response
}

describe('speed-test / validateUrl', () => {
  it('空/非法/非 http(s) 报错', () => {
    expect(() => validateUrl('  ')).toThrow(/请输入要测速/)
    expect(() => validateUrl('nope')).toThrow(/格式不正确/)
    expect(() => validateUrl('ftp://a.com/')).toThrow(/只支持 http/)
  })
  it('合法返回规范化 href', () => {
    expect(validateUrl('https://a.com')).toBe('https://a.com/')
  })
})

describe('speed-test / isSameOrigin', () => {
  it('同源返回 true', () => {
    expect(isSameOrigin('https://x.test/a', 'https://x.test')).toBe(true)
  })
  it('跨域返回 false', () => {
    expect(isSameOrigin('https://y.test/', 'https://x.test')).toBe(false)
  })
  it('非法 URL 返回 false', () => {
    expect(isSameOrigin('http://exa mple.com/', 'https://x.test')).toBe(false)
  })
  it('默认取全局 location（node 环境无 location → 空源）', () => {
    expect(isSameOrigin('https://x.test/')).toBe(false)
  })
  it('stub location 后同源判定走 location.origin', () => {
    vi.stubGlobal('location', { origin: 'https://x.test' })
    expect(isSameOrigin('https://x.test/a')).toBe(true)
    expect(isSameOrigin('https://y.test/')).toBe(false)
  })
})

describe('speed-test / measureOnce', () => {
  it('URL 非法直接抛错', async () => {
    await expect(measureOnce('nope', okFetch(), clock())).rejects.toThrow(/格式不正确/)
  })

  it('正常响应：ok，含 ttfb 与体积', async () => {
    const r = await measureOnce('https://x.test/', okFetch('hello'), clock())
    expect(r).toMatchObject({ ok: true, status: 200, ttfbMs: 25, totalMs: 50, sizeBytes: 5, approximate: false, error: '' })
  })

  it('多 chunk 累加体积', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('ab'))
        c.enqueue(new TextEncoder().encode('cdef'))
        c.close()
      },
    })
    const mock: FetchFn = async () => new Response(stream, { status: 200 })
    const r = await measureOnce('https://x.test/', mock, clock())
    expect(r.sizeBytes).toBe(6)
    expect(r.ok).toBe(true)
  })

  it('空 body：循环跳过', async () => {
    const mock: FetchFn = async () => new Response('', { status: 200 })
    const r = await measureOnce('https://x.test/', mock, clock())
    expect(r).toMatchObject({ ok: true, sizeBytes: 0, approximate: false })
  })

  it('body 为 null：近似', async () => {
    const mock: FetchFn = async () => new Response(null, { status: 200 })
    const r = await measureOnce('https://x.test/', mock, clock())
    expect(r).toMatchObject({ ok: true, ttfbMs: null, sizeBytes: null, approximate: true })
  })

  it('opaque 响应：近似，只测总耗时', async () => {
    const mock: FetchFn = async () => opaque()
    const r = await measureOnce('https://x.test/', mock, clock(), 'no-cors')
    expect(r).toMatchObject({ ok: true, status: null, ttfbMs: null, approximate: true, error: '' })
    expect(r.totalMs).toBe(25)
  })

  it('非 2xx：失败并带状态码', async () => {
    const mock: FetchFn = async () => new Response('nf', { status: 404 })
    const r = await measureOnce('https://x.test/', mock, clock())
    expect(r).toMatchObject({ ok: false, status: 404 })
    expect(r.error).toContain('HTTP 404')
  })

  it('超时返回失败结果', async () => {
    const hanging: FetchFn = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        )
      })
    const r = await measureOnce('https://x.test/', hanging, clock(), 'cors', 20)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('超时')
  })

  it('网络失败（Error）', async () => {
    const mock: FetchFn = async () => {
      throw new Error('dns fail')
    }
    const r = await measureOnce('https://x.test/', mock, clock())
    expect(r.error).toContain('网络请求失败')
    expect(r.error).toContain('dns fail')
  })

  it('网络失败（非 Error）', async () => {
    const mock: FetchFn = async () => {
      throw 'boom'
    }
    const r = await measureOnce('https://x.test/', mock, clock())
    expect(r.error).toContain('boom')
  })

  it('网络失败（DOMException 非 Abort）', async () => {
    const mock: FetchFn = async () => {
      throw new DOMException('denied', 'SecurityError')
    }
    const r = await measureOnce('https://x.test/', mock, clock())
    expect(r.error).toContain('网络请求失败')
  })

  it('默认参数走默认 fetch 与 performance.now（stub 全局 fetch）', async () => {
    vi.stubGlobal('fetch', okFetch('hi') as unknown as typeof fetch)
    const r = await measureOnce('https://x.test/')
    expect(r.ok).toBe(true)
    expect(r.sizeBytes).toBe(2)
    expect(r.totalMs).toBeGreaterThanOrEqual(0)
  })
})

describe('speed-test / measure', () => {
  it('次数非法抛错', async () => {
    await expect(measure('https://x.test/', okFetch(), clock(), { times: 0 })).rejects.toThrow(/至少为 1/)
  })

  it('3 次平均聚合', async () => {
    const agg = await measure('https://x.test/', okFetch('hello'), clock(), { times: 3 })
    expect(agg.okRuns).toBe(3)
    expect(agg.runs).toHaveLength(3)
    expect(agg.avgMs).toBe(50)
    expect(agg.minMs).toBe(50)
    expect(agg.maxMs).toBe(50)
    expect(agg.avgTtfbMs).toBe(25)
    expect(agg.sizeBytes).toBe(5)
    expect(agg.approximate).toBe(false)
    expect(agg.grade).toBe('优等')
  })

  it('全部失败时抛首个错误', async () => {
    const mock: FetchFn = async () => {
      throw new Error('down')
    }
    await expect(measure('https://x.test/', mock, clock(), { times: 2 })).rejects.toThrow(/down/)
  })

  it('部分失败：只聚合成功的', async () => {
    let n = 0
    const mock: FetchFn = async () => {
      n++
      if (n === 1) throw new Error('blip')
      return new Response('hello', { status: 200 })
    }
    const agg = await measure('https://x.test/', mock, clock(), { times: 3 })
    expect(agg.okRuns).toBe(2)
    expect(agg.runs).toHaveLength(3)
  })

  it('opaque 聚合：ttfb/体积为 null 且标记近似', async () => {
    const mock: FetchFn = async () => opaque()
    const agg = await measure('https://x.test/', mock, clock(), { times: 2, requestMode: 'no-cors' })
    expect(agg.avgTtfbMs).toBeNull()
    expect(agg.sizeBytes).toBeNull()
    expect(agg.approximate).toBe(true)
  })

  it('默认参数（times/requestMode/timeoutMs）', async () => {
    const agg = await measure('https://x.test/', okFetch('hello'), clock())
    expect(agg.runs).toHaveLength(3)
    expect(agg.okRuns).toBe(3)
  })
})

describe('speed-test / scoreTiming', () => {
  it('五档分级', () => {
    expect(scoreTiming(500)).toEqual({ grade: '优等', score: 95 })
    expect(scoreTiming(1500)).toEqual({ grade: '良好', score: 80 })
    expect(scoreTiming(2500)).toEqual({ grade: '一般', score: 65 })
    expect(scoreTiming(4000)).toEqual({ grade: '较慢', score: 45 })
    expect(scoreTiming(9000)).toEqual({ grade: '慢', score: 20 })
  })
  it('边界值', () => {
    expect(scoreTiming(1000).grade).toBe('良好')
    expect(scoreTiming(2000).grade).toBe('一般')
    expect(scoreTiming(3000).grade).toBe('较慢')
    expect(scoreTiming(5000).grade).toBe('慢')
  })
})

describe('speed-test / formatSize', () => {
  it('B / KiB / MiB', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(2048)).toBe('2.0 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
  })
})

describe('speed-test / renderReport', () => {
  it('精确测量报告', async () => {
    const agg = await measure('https://x.test/', okFetch('hello'), clock(), { times: 1 })
    const out = renderReport(agg)
    expect(out).toContain('目标：https://x.test/')
    expect(out).toContain('评级：优等（95 分）')
    expect(out).toContain('平均耗时：50 ms')
    expect(out).toContain('平均 TTFB：25 ms')
    expect(out).toContain('传输体积：5 B')
    expect(out).not.toContain('近似值')
    expect(out).toContain('#1 50 ms')
  })

  it('近似测量报告标注跨域限制', async () => {
    const mock: FetchFn = async () => opaque()
    const agg = await measure('https://x.test/', mock, clock(), { times: 1, requestMode: 'no-cors' })
    const out = renderReport(agg)
    expect(out).toContain('平均 TTFB：不可测（跨域近似）')
    expect(out).toContain('传输体积：不可读（跨域近似）')
    expect(out).toContain('跨域测量为近似值')
    expect(out).toContain('[近似]')
  })

  it('失败的单次测量渲染错误行', async () => {
    let n = 0
    const mock: FetchFn = async () => {
      n++
      if (n === 1) throw new Error('blip')
      return new Response('hello', { status: 200 })
    }
    const agg = await measure('https://x.test/', mock, clock(), { times: 2 })
    const out = renderReport(agg)
    expect(out).toContain('#1 失败：网络请求失败')
  })
})

describe('speed-test / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '   ' }, opts1)).resolves.toBe('')
  })
  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, opts1)).rejects.toThrow(/上限/)
  })
  it('跨域走 no-cors（node 无 location）', async () => {
    let mode: string | undefined
    const mock: FetchFn = async (_url, init) => {
      mode = init?.mode
      return opaque()
    }
    const out = await transform({ text: 'https://x.test/' }, opts1, mock, clock())
    expect(mode).toBe('no-cors')
    expect(out).toContain('评级：')
  })
  it('同源走 cors（stub location）', async () => {
    vi.stubGlobal('location', { origin: 'https://x.test' })
    let mode: string | undefined
    const mock: FetchFn = async (_url, init) => {
      mode = init?.mode
      return new Response('hello', { status: 200 })
    }
    const out = await transform({ text: 'https://x.test/' }, opts1, mock, clock())
    expect(mode).toBe('cors')
    expect(out).toContain('评级：优等')
  })
  it('默认 fetch/now（stub 全局 fetch）', async () => {
    vi.stubGlobal('fetch', okFetch('hello') as unknown as typeof fetch)
    const out = await transform({ text: 'https://x.test/' }, opts1)
    expect(out).toContain('目标：https://x.test/')
  })
})
