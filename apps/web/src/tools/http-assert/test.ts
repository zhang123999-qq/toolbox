/**
 * http-assert（#748）utils 单测：fetch 全部 mock 注入，无真实网络。
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  assertUrl,
  checkAssertion,
  deepEqual,
  errorMessage,
  formatReport,
  getJsonPath,
  parseAssertions,
  parseHeaders,
  runHttpAssertions,
  type AssertContext,
  type Assertion,
  type FetchImpl,
  type HttpRequest,
} from './utils'

afterEach(() => {
  vi.restoreAllMocks()
})

function req(over: Partial<HttpRequest> = {}): HttpRequest {
  return { url: 'https://api.example.com/health', method: 'GET', headers: {}, body: '', ...over }
}

function ctx(over: Partial<AssertContext> = {}): AssertContext {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    bodyText: '{"ok":true}',
    bodyJson: { ok: true },
    durationMs: 120,
    ...over,
  }
}

function mockFetch(res: {
  status?: number
  headers?: unknown
  text?: string | (() => Promise<string>)
}): FetchImpl {
  return vi.fn(async () => ({
    status: res.status ?? 200,
    headers: res.headers,
    text: async () => (typeof res.text === 'function' ? res.text() : (res.text ?? '')),
  })) as unknown as FetchImpl
}

describe('parseHeaders', () => {
  it('多行解析', () => {
    expect(parseHeaders('A: 1\nB: 2')).toEqual({ A: '1', B: '2' })
  })
  it('空行与无冒号行跳过', () => {
    expect(parseHeaders('\nno-colon\nC: 3')).toEqual({ C: '3' })
  })
  it('空键跳过', () => {
    expect(parseHeaders(': v\nD: 4')).toEqual({ D: '4' })
  })
  it('值含冒号保留', () => {
    expect(parseHeaders('X: a:b')).toEqual({ X: 'a:b' })
  })
})

describe('assertUrl', () => {
  it('空 URL 抛错', () => {
    expect(() => assertUrl('  ')).toThrow('请输入请求 URL')
  })
  it('非 http(s) 抛错', () => {
    expect(() => assertUrl('ftp://x.com')).toThrow('必须以 http:// 或 https:// 开头')
  })
  it('合法通过', () => {
    expect(() => assertUrl('https://x.com')).not.toThrow()
  })
})

describe('getJsonPath', () => {
  it('空路径返回 undefined', () => {
    expect(getJsonPath({ a: 1 }, '  ')).toBeUndefined()
  })
  it('嵌套与数组下标', () => {
    expect(getJsonPath({ a: { b: [{ c: 9 }] } }, 'a.b.0.c')).toBe(9)
  })
  it('数组非数字下标返回 undefined', () => {
    expect(getJsonPath({ a: [1] }, 'a.x')).toBeUndefined()
  })
  it('中间 null 与原始值返回 undefined', () => {
    expect(getJsonPath({ a: null }, 'a.b')).toBeUndefined()
    expect(getJsonPath({ a: 1 }, 'a.b')).toBeUndefined()
  })
  it('缺失键返回 undefined', () => {
    expect(getJsonPath({}, 'a')).toBeUndefined()
  })
})

describe('deepEqual', () => {
  it('全等与原始值', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 1)).toBe(false)
  })
  it('null 处理', () => {
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual({}, null)).toBe(false)
  })
  it('数组与对象混用不等', () => {
    expect(deepEqual([1], { 0: 1 })).toBe(false)
    expect(deepEqual({ 0: 1 }, [1])).toBe(false)
  })
  it('数组长度与元素', () => {
    expect(deepEqual([1, 2], [1])).toBe(false)
    expect(deepEqual([1, 2], [1, 3])).toBe(false)
    expect(deepEqual([1, [2]], [1, [2]])).toBe(true)
  })
  it('对象键数量与值', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
  })
})

describe('parseAssertions', () => {
  it('非法 JSON 抛错', () => {
    expect(() => parseAssertions('{')).toThrow('不是合法 JSON')
  })
  it('非数组与空数组抛错', () => {
    expect(() => parseAssertions('{}')).toThrow('必须是数组')
    expect(() => parseAssertions('[]')).toThrow('至少定义一条断言')
  })
  it('条目非对象抛错', () => {
    expect(() => parseAssertions('[1]')).toThrow('第 1 条断言必须是对象')
  })
  it('status 校验', () => {
    expect(() => parseAssertions('[{"type":"status","expected":200.5}]')).toThrow('expected 必须是整数')
    expect(parseAssertions('[{"type":"status","expected":200}]')).toEqual([
      { type: 'status', expected: 200 },
    ])
  })
  it('statusRange 校验', () => {
    expect(() => parseAssertions('[{"type":"statusRange","min":300,"max":200}]')).toThrow(
      'min 不能大于 max',
    )
    expect(parseAssertions('[{"type":"statusRange","min":200,"max":299}]')).toEqual([
      { type: 'statusRange', min: 200, max: 299 },
    ])
  })
  it('header 校验', () => {
    expect(() => parseAssertions('[{"type":"header","name":"  "}]')).toThrow('name 必须是非空字符串')
    expect(() => parseAssertions('[{"type":"header","name":"x","expected":1}]')).toThrow(
      'expected 必须是字符串',
    )
    expect(parseAssertions('[{"type":"header","name":"x"}]')).toEqual([{ type: 'header', name: 'x' }])
    expect(parseAssertions('[{"type":"header","name":"x","expected":"y"}]')).toEqual([
      { type: 'header', name: 'x', expected: 'y' },
    ])
  })
  it('bodyContains 校验', () => {
    expect(() => parseAssertions('[{"type":"bodyContains","text":""}]')).toThrow(
      'text 必须是非空字符串',
    )
  })
  it('bodyJsonPath 校验', () => {
    expect(() => parseAssertions('[{"type":"bodyJsonPath","path":" "}]')).toThrow(
      'path 必须是非空字符串',
    )
    expect(parseAssertions('[{"type":"bodyJsonPath","path":"a.b","expected":1}]')).toEqual([
      { type: 'bodyJsonPath', path: 'a.b', expected: 1 },
    ])
  })
  it('timeLt 校验', () => {
    expect(() => parseAssertions('[{"type":"timeLt","ms":0}]')).toThrow('ms 必须是正数')
    expect(() => parseAssertions('[{"type":"timeLt"}]')).toThrow('ms 必须是正数')
  })
  it('未知 type 抛错', () => {
    expect(() => parseAssertions('[{"type":"nope"}]')).toThrow('type 非法：nope')
  })
})

describe('checkAssertion', () => {
  it('status 通过与失败', () => {
    expect(checkAssertion({ type: 'status', expected: 200 }, ctx()).pass).toBe(true)
    const r = checkAssertion({ type: 'status', expected: 404 }, ctx())
    expect(r.pass).toBe(false)
    expect(r.message).toContain('期望 404，实际 200')
  })
  it('statusRange 通过与失败', () => {
    expect(checkAssertion({ type: 'statusRange', min: 200, max: 299 }, ctx()).pass).toBe(true)
    expect(checkAssertion({ type: 'statusRange', min: 500, max: 599 }, ctx()).pass).toBe(false)
  })
  it('header 缺失/存在/相等/不等', () => {
    expect(checkAssertion({ type: 'header', name: 'x-missing' }, ctx()).pass).toBe(false)
    expect(checkAssertion({ type: 'header', name: 'Content-Type' }, ctx()).pass).toBe(true)
    expect(
      checkAssertion({ type: 'header', name: 'content-type', expected: 'application/json' }, ctx()).pass,
    ).toBe(true)
    const r = checkAssertion({ type: 'header', name: 'content-type', expected: 'text/html' }, ctx())
    expect(r.pass).toBe(false)
    expect(r.message).toContain('期望 text/html，实际 application/json')
  })
  it('bodyContains 通过与失败', () => {
    expect(checkAssertion({ type: 'bodyContains', text: 'ok' }, ctx()).pass).toBe(true)
    expect(checkAssertion({ type: 'bodyContains', text: 'nope' }, ctx()).pass).toBe(false)
  })
  it('bodyJsonPath 非 JSON/路径缺失/匹配/不等', () => {
    expect(
      checkAssertion({ type: 'bodyJsonPath', path: 'ok', expected: true }, ctx({ bodyJson: undefined })).pass,
    ).toBe(false)
    const missing = checkAssertion({ type: 'bodyJsonPath', path: 'nope', expected: 1 }, ctx())
    expect(missing.pass).toBe(false)
    expect(missing.message).toContain('路径 nope 不存在')
    expect(
      checkAssertion({ type: 'bodyJsonPath', path: 'ok', expected: true }, ctx()).pass,
    ).toBe(true)
    const ne = checkAssertion({ type: 'bodyJsonPath', path: 'ok', expected: false }, ctx())
    expect(ne.pass).toBe(false)
    expect(ne.message).toContain('期望 false，实际 true')
  })
  it('timeLt 通过与失败', () => {
    expect(checkAssertion({ type: 'timeLt', ms: 1000 }, ctx()).pass).toBe(true)
    expect(checkAssertion({ type: 'timeLt', ms: 10 }, ctx()).pass).toBe(false)
  })
  it('未知类型返回失败', () => {
    const r = checkAssertion({ type: 'nope' } as unknown as Assertion, ctx())
    expect(r.pass).toBe(false)
    expect(r.message).toContain('未知断言类型')
  })
})

describe('runHttpAssertions', () => {
  it('非法 URL 直接抛错', async () => {
    await expect(runHttpAssertions(req({ url: 'bad' }), [], mockFetch({}))).rejects.toThrow(
      '必须以 http:// 或 https:// 开头',
    )
  })
  it('网络错误返回中文 error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as FetchImpl
    const r = await runHttpAssertions(req(), [{ type: 'status', expected: 200 }], fetchImpl)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('请求失败')
    expect(r.error).toContain('CORS')
    expect(r.results).toEqual([])
  })
  it('全部通过', async () => {
    const r = await runHttpAssertions(
      req(),
      [
        { type: 'status', expected: 200 },
        { type: 'header', name: 'content-type' },
        { type: 'bodyJsonPath', path: 'ok', expected: true },
        { type: 'timeLt', ms: 60000 },
      ],
      mockFetch({ headers: { 'Content-Type': 'application/json' }, text: '{"ok":true}' }),
    )
    expect(r.ok).toBe(true)
    expect(r.passed).toBe(4)
    expect(r.total).toBe(4)
    expect(r.status).toBe(200)
    expect(r.durationMs).toBeGreaterThanOrEqual(0)
  })
  it('部分失败时 ok 为 false', async () => {
    const r = await runHttpAssertions(
      req(),
      [{ type: 'status', expected: 200 }, { type: 'status', expected: 201 }],
      mockFetch({ text: 'x' }),
    )
    expect(r.ok).toBe(false)
    expect(r.passed).toBe(1)
  })
  it('POST 带请求体时 init.body 被设置', async () => {
    let captured: RequestInit | null = null
    const fetchImpl = vi.fn(async (_u: string, init: RequestInit) => {
      captured = init
      return { status: 200, headers: {}, text: async () => '' }
    }) as unknown as FetchImpl
    await runHttpAssertions(req({ method: 'POST', body: '{"a":1}' }), [], fetchImpl)
    expect(captured!.body).toBe('{"a":1}')
    expect(captured!.method).toBe('POST')
  })
  it('GET 不发送请求体', async () => {
    let captured: RequestInit | null = null
    const fetchImpl = vi.fn(async (_u: string, init: RequestInit) => {
      captured = init
      return { status: 200, headers: {}, text: async () => '' }
    }) as unknown as FetchImpl
    await runHttpAssertions(req({ method: 'GET', body: '{"a":1}' }), [], fetchImpl)
    expect(captured!.body).toBeUndefined()
  })
  it('Headers 实例被正确转换', async () => {
    const r = await runHttpAssertions(
      req(),
      [{ type: 'header', name: 'X-Custom', expected: 'v' }],
      mockFetch({ headers: new Headers({ 'x-custom': 'v' }), text: '' }),
    )
    expect(r.results[0].pass).toBe(true)
  })
  it('无 headers 字段时不断言头', async () => {
    const r = await runHttpAssertions(req(), [{ type: 'status', expected: 200 }], mockFetch({}))
    expect(r.ok).toBe(true)
  })
  it('非 JSON 响应体时 bodyJsonPath 失败', async () => {
    const r = await runHttpAssertions(
      req(),
      [{ type: 'bodyJsonPath', path: 'a', expected: 1 }],
      mockFetch({ text: 'not json' }),
    )
    expect(r.results[0].pass).toBe(false)
    expect(r.results[0].message).toContain('不是合法 JSON')
  })
})

describe('formatReport', () => {
  it('错误报告直接返回 error', () => {
    const r = formatReport({
      ok: false,
      passed: 0,
      total: 1,
      status: 0,
      durationMs: 0,
      results: [],
      error: '请求失败：x',
    })
    expect(r).toBe('请求失败：x')
  })
  it('正常报告含通过率与逐条结果', async () => {
    const report = await runHttpAssertions(
      req(),
      [{ type: 'status', expected: 200 }],
      mockFetch({ text: '' }),
    )
    const out = formatReport(report)
    expect(out).toContain('测试通过：1/1')
    expect(out).toContain('✓ 断言 1')
  })
  it('失败报告标 ✗', async () => {
    const report = await runHttpAssertions(
      req(),
      [{ type: 'status', expected: 500 }],
      mockFetch({ text: '' }),
    )
    const out = formatReport(report)
    expect(out).toContain('测试未通过')
    expect(out).toContain('✗ 断言 1')
  })
})

describe('errorMessage', () => {
  it('Error 取 message', () => {
    expect(errorMessage(new Error('oops'))).toBe('oops')
  })
  it('非 Error 转字符串', () => {
    expect(errorMessage('boom')).toBe('boom')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('parseAssertions 补充', () => {
  it('合法 bodyContains', () => {
    expect(parseAssertions('[{"type":"bodyContains","text":"ok"}]')).toEqual([
      { type: 'bodyContains', text: 'ok' },
    ])
  })
  it('合法 timeLt', () => {
    expect(parseAssertions('[{"type":"timeLt","ms":100}]')).toEqual([
      { type: 'timeLt', ms: 100 },
    ])
  })
})
