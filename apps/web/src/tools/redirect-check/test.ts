import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RedirectCheckOptions } from './schema'
import type { FetchFn } from './utils'
import {
  analyzePastedResponse,
  isRedirectStatus,
  parseHeaders,
  parseStatusLine,
  renderPasted,
  renderTrace,
  resolveTarget,
  traceRedirects,
  transform,
  validateUrl,
} from './utils'

afterEach(() => {
  vi.unstubAllGlobals()
})

const realtime: RedirectCheckOptions = { mode: '实时检测' }
const paste: RedirectCheckOptions = { mode: '粘贴分析' }

/** 构造普通 Response */
function res(status: number, location?: string, body: string | null = null): Response {
  const headers: Record<string, string> = {}
  if (location !== undefined) headers.location = location
  return new Response(body, { status, headers })
}

/** 构造跨域 opaque-redirect（Response 构造器造不出，用裸对象） */
function opaque(): Response {
  return { type: 'opaqueredirect', status: 0, headers: new Headers() } as unknown as Response
}

describe('redirect-check / validateUrl', () => {
  it('空输入报错', () => {
    expect(() => validateUrl('   ')).toThrow(/请输入要检测的 URL/)
  })
  it('非法 URL 报错', () => {
    expect(() => validateUrl('not a url')).toThrow(/格式不正确/)
  })
  it('非 http(s) 协议报错', () => {
    expect(() => validateUrl('ftp://example.com/x')).toThrow(/只支持 http/)
  })
  it('合法 URL 返回规范化 href', () => {
    expect(validateUrl('https://example.com')).toBe('https://example.com/')
  })
})

describe('redirect-check / isRedirectStatus', () => {
  it('301/302/303/307/308 为重定向', () => {
    for (const s of [301, 302, 303, 307, 308]) expect(isRedirectStatus(s)).toBe(true)
  })
  it('200/404 不是重定向', () => {
    expect(isRedirectStatus(200)).toBe(false)
    expect(isRedirectStatus(404)).toBe(false)
  })
})

describe('redirect-check / parseStatusLine', () => {
  it('非法行返回 null', () => {
    expect(parseStatusLine('hello world')).toBeNull()
    expect(parseStatusLine('')).toBeNull()
  })
  it('带 reason 解析', () => {
    expect(parseStatusLine('HTTP/1.1 301 Moved Permanently')).toEqual({
      version: 'HTTP/1.1',
      status: 301,
      reason: 'Moved Permanently',
    })
  })
  it('无 reason 解析', () => {
    expect(parseStatusLine('HTTP/2 302')).toEqual({ version: 'HTTP/2', status: 302, reason: '' })
  })
})

describe('redirect-check / parseHeaders', () => {
  it('跳过空行/状态行/无冒号行/空名行，同名合并', () => {
    const map = parseHeaders(
      'HTTP/1.1 301 Moved\r\nLocation: /a\r\n\r\nno-colon-line\r\n: empty-name\r\nSet-Cookie: a=1\r\nSet-Cookie: b=2\r\n',
    )
    expect(map.get('location')).toBe('/a')
    expect(map.get('set-cookie')).toBe('a=1, b=2')
    expect(map.has('')).toBe(false)
    expect(map.size).toBe(2)
  })
})

describe('redirect-check / resolveTarget', () => {
  it('空 Location 报错', () => {
    expect(() => resolveTarget('https://a.com/', '  ')).toThrow(/Location 为空/)
  })
  it('非法 Location 报错', () => {
    expect(() => resolveTarget('https://a.com/', 'http://exa mple.com/')).toThrow(/不是合法 URL/)
  })
  it('相对路径相对 base 解析', () => {
    expect(resolveTarget('https://a.com/dir/', '../x')).toBe('https://a.com/x')
  })
  it('协议相对地址继承协议', () => {
    expect(resolveTarget('https://a.com/', '//b.com/p')).toBe('https://b.com/p')
  })
})

describe('redirect-check / traceRedirects', () => {
  it('非法起始 URL 直接抛错', async () => {
    const never: FetchFn = async () => res(200)
    await expect(traceRedirects('nope', never)).rejects.toThrow(/格式不正确/)
  })

  it('无重定向一次结束', async () => {
    const mock: FetchFn = async () => res(200, undefined, 'hello')
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('ok')
    expect(r.finalUrl).toBe('https://x.test/')
    expect(r.hops).toHaveLength(1)
    expect(r.message).toContain('200')
  })

  it('两跳后结束', async () => {
    const mock: FetchFn = async (url) =>
      url === 'https://x.test/' ? res(301, '/b') : res(200, undefined, 'done')
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('ok')
    expect(r.finalUrl).toBe('https://x.test/b')
    expect(r.hops).toHaveLength(2)
    expect(r.hops[1].status).toBe(200)
  })

  it('检测到循环', async () => {
    const mock: FetchFn = async (url) => (url.endsWith('/a') ? res(302, '/b') : res(302, '/a'))
    const r = await traceRedirects('http://x.test/a', mock)
    expect(r.terminated).toBe('loop')
    expect(r.message).toContain('循环')
  })

  it('超过最大跳数', async () => {
    let i = 0
    const mock: FetchFn = async () => res(301, `/h${++i}`)
    const r = await traceRedirects('http://x.test/h0', mock, { maxHops: 2 })
    expect(r.terminated).toBe('maxHops')
    expect(r.hops).toHaveLength(3)
  })

  it('跨域 opaque 如实报告', async () => {
    const mock: FetchFn = async () => opaque()
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('opaque')
    expect(r.hops[0].status).toBeNull()
    expect(r.message).toContain('跨域')
  })

  it('重定向码无 Location 时终止并注明', async () => {
    const mock: FetchFn = async () => res(301)
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('ok')
    expect(r.message).toContain('未带 Location')
  })

  it('非法 Location 终止为 error', async () => {
    const mock: FetchFn = async () => res(301, 'http://exa mple.com/')
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('error')
    expect(r.message).toContain('不是合法 URL')
  })

  it('HEAD 405 回退 GET', async () => {
    const calls: string[] = []
    const mock: FetchFn = async (_url, init) => {
      calls.push(init?.method ?? '')
      return init?.method === 'HEAD' ? res(405) : res(200, undefined, 'ok')
    }
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('ok')
    expect(calls).toEqual(['HEAD', 'GET'])
  })

  it('HEAD 501 回退 GET', async () => {
    const mock: FetchFn = async (_url, init) =>
      init?.method === 'HEAD' ? res(501) : res(200, undefined, 'ok')
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('ok')
    expect(r.hops[0].status).toBe(200)
  })

  it('HEAD 405 但自带 Location 时不回退', async () => {
    let n = 0
    const mock: FetchFn = async () => {
      n++
      return res(405, '/go')
    }
    const r = await traceRedirects('https://x.test/', mock, { maxHops: 0 })
    expect(n).toBe(1)
    expect(r.terminated).toBe('ok') // 405 非跳转状态，直接终结
    expect(r.hops[0].status).toBe(405)
    expect(r.hops[0].location).toBe('/go')
  })

  it('GET 回退后仍 opaque', async () => {
    const mock: FetchFn = async (_url, init) => (init?.method === 'HEAD' ? res(405) : opaque())
    const r = await traceRedirects('https://x.test/', mock)
    expect(r.terminated).toBe('opaque')
  })

  it('超时抛中文错', async () => {
    const hanging: FetchFn = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        )
      })
    await expect(traceRedirects('https://x.test/', hanging, { timeoutMs: 20 })).rejects.toThrow(
      /超时/,
    )
  })

  it('网络失败（Error）抛中文错', async () => {
    const mock: FetchFn = async () => {
      throw new Error('dns fail')
    }
    await expect(traceRedirects('https://x.test/', mock)).rejects.toThrow(/网络请求失败.*dns fail/)
  })

  it('网络失败（非 Error）抛中文错', async () => {
    const mock: FetchFn = async () => {
      throw 'boom'
    }
    await expect(traceRedirects('https://x.test/', mock)).rejects.toThrow(/网络请求失败.*boom/)
  })

  it('网络失败（DOMException 非 Abort）走网络失败分支', async () => {
    const mock: FetchFn = async () => {
      throw new DOMException('denied', 'SecurityError')
    }
    await expect(traceRedirects('https://x.test/', mock)).rejects.toThrow(/网络请求失败/)
  })

  it('默认参数走默认 fetch（stub 全局 fetch，无真实请求）', async () => {
    vi.stubGlobal('fetch', (async () => res(200, undefined, 'stubbed')) as FetchFn)
    const r = await traceRedirects('https://x.test/')
    expect(r.terminated).toBe('ok')
    expect(r.hops).toHaveLength(1)
  })
})

describe('redirect-check / analyzePastedResponse', () => {
  it('空文本报错', () => {
    expect(analyzePastedResponse('  ').error).toContain('请粘贴')
  })
  it('首行非法报错', () => {
    expect(analyzePastedResponse('garbage line').error).toContain('状态行')
  })
  it('301 带 Location（绝对地址，无需 base）', () => {
    const a = analyzePastedResponse('HTTP/1.1 301 Moved\r\nLocation: https://b.com/x\r\n')
    expect(a).toMatchObject({
      status: 301,
      isRedirect: true,
      location: 'https://b.com/x',
      resolvedTarget: 'https://b.com/x',
      error: null,
    })
  })
  it('相对 Location 配 baseUrl 解析', () => {
    const a = analyzePastedResponse('HTTP/1.1 302 Found\nLocation: /new\n', 'https://a.com/old')
    expect(a.resolvedTarget).toBe('https://a.com/new')
  })
  it('相对 Location 无 base 时 resolvedTarget 为 null', () => {
    const a = analyzePastedResponse('HTTP/1.1 302 Found\nLocation: /new\n')
    expect(a.location).toBe('/new')
    expect(a.resolvedTarget).toBeNull()
  })
  it('非法 Location 时 resolvedTarget 为 null', () => {
    const a = analyzePastedResponse('HTTP/1.1 302 Found\nLocation: http://exa mple/\n')
    expect(a.resolvedTarget).toBeNull()
  })
  it('200 无 Location', () => {
    const a = analyzePastedResponse('HTTP/1.1 200 OK\nContent-Type: text/html\n')
    expect(a).toMatchObject({
      status: 200,
      isRedirect: false,
      location: null,
      resolvedTarget: null,
    })
  })
  it('空 Location 头视为无', () => {
    const a = analyzePastedResponse('HTTP/1.1 302 Found\nLocation: \n')
    expect(a.location).toBe('')
    expect(a.resolvedTarget).toBeNull()
  })
})

describe('redirect-check / renderTrace', () => {
  it('渲染跳转链文本', async () => {
    const mock: FetchFn = async (url) =>
      url === 'https://x.test/' ? res(301, '/b') : res(200, undefined, 'done')
    const out = renderTrace(await traceRedirects('https://x.test/', mock))
    expect(out).toContain('起始 URL：https://x.test/')
    expect(out).toContain('跳转次数：1')
    expect(out).toContain('最终 URL：https://x.test/b')
    expect(out).toContain('[0] 301')
    expect(out).toContain('[1] 200')
  })
  it('跨域跳渲染为未知', async () => {
    const mock: FetchFn = async () => opaque()
    const out = renderTrace(await traceRedirects('https://x.test/', mock))
    expect(out).toContain('未知（跨域）')
    expect(out).toContain('跨域不可读')
  })
})

describe('redirect-check / renderPasted', () => {
  it('有 error 时抛错', () => {
    expect(() => renderPasted(analyzePastedResponse('  '))).toThrow(/请粘贴/)
  })
  it('正常渲染', () => {
    const out = renderPasted(
      analyzePastedResponse('HTTP/1.1 301 Moved\nLocation: https://b.com/\n'),
    )
    expect(out).toContain('状态码：301')
    expect(out).toContain('是否重定向：是')
    expect(out).toContain('https://b.com/')
  })
  it('无 Location 渲染为无', () => {
    const out = renderPasted(analyzePastedResponse('HTTP/1.1 200 OK\n'))
    expect(out).toContain('Location：（无）')
    expect(out).toContain('解析后目标：（无')
  })
})

describe('redirect-check / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '   ' }, realtime)).resolves.toBe('')
  })
  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, realtime)).rejects.toThrow(/上限/)
  })
  it('粘贴模式走离线分析', async () => {
    const out = await transform({ text: 'HTTP/1.1 301 Moved\nLocation: https://b.com/\n' }, paste)
    expect(out).toContain('状态码：301')
  })
  it('粘贴模式非法内容抛错', async () => {
    await expect(transform({ text: 'not http' }, paste)).rejects.toThrow(/状态行/)
  })
  it('实时模式跟踪并渲染', async () => {
    const mock: FetchFn = async () => res(200, undefined, 'ok')
    const out = await transform({ text: 'https://x.test/' }, realtime, mock)
    expect(out).toContain('跟踪结束')
  })
  it('实时模式默认 fetch（stub 全局 fetch）', async () => {
    vi.stubGlobal('fetch', (async () => res(200, undefined, 'stubbed')) as FetchFn)
    const out = await transform({ text: 'https://x.test/' }, realtime)
    expect(out).toContain('跟踪结束')
  })
})
