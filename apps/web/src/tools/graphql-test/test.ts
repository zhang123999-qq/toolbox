/**
 * graphql-test（#752）utils 单测：fetch 全部 mock 注入，无真实网络。
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  DEFAULT_QUERY,
  INTROSPECTION_QUERY,
  assertEndpoint,
  errorMessage,
  formatGraphqlResult,
  parseHeaders,
  parseVariables,
  sendGraphql,
  stripGqlStrings,
  validateGraphqlQuery,
  type FetchImpl,
  type GraphqlRequest,
} from './utils'

afterEach(() => {
  vi.restoreAllMocks()
})

function req(over: Partial<GraphqlRequest> = {}): GraphqlRequest {
  return {
    endpoint: 'https://api.example.com/graphql',
    query: '{ __typename }',
    variables: '',
    headers: {},
    ...over,
  }
}

function mockFetch(res: { ok?: boolean; status?: number; text?: string }): {
  fetchImpl: FetchImpl
  box: { captured: { url: string; init: RequestInit } | null }
} {
  const box: { captured: { url: string; init: RequestInit } | null } = { captured: null }
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    box.captured = { url, init }
    return { ok: res.ok ?? true, status: res.status ?? 200, text: async () => res.text ?? '' }
  }) as unknown as FetchImpl
  return { fetchImpl, box }
}

describe('assertEndpoint', () => {
  it('空端点抛错', () => {
    expect(() => assertEndpoint('  ')).toThrow('请输入 GraphQL 端点 URL')
  })
  it('非 http(s) 抛错', () => {
    expect(() => assertEndpoint('ws://x.com')).toThrow('必须以 http:// 或 https:// 开头')
  })
  it('合法通过', () => {
    expect(() => assertEndpoint('https://x.com/graphql')).not.toThrow()
  })
})

describe('parseHeaders', () => {
  it('多行解析与脏行跳过', () => {
    expect(parseHeaders('A: 1\n\nno-colon\n: x\nB: 2')).toEqual({ A: '1', B: '2' })
  })
})

describe('stripGqlStrings', () => {
  it('普通字符串被去掉', () => {
    expect(stripGqlStrings('{ f(arg: "}") }')).toBe('{ f(arg: ) }')
  })
  it('转义引号不提前结束', () => {
    expect(stripGqlStrings('{ f(arg: "a\\"b") }')).toBe('{ f(arg: ) }')
  })
  it('块字符串闭合与未闭合', () => {
    expect(stripGqlStrings('"""doc { """ { x }')).toBe(' { x }')
    expect(stripGqlStrings('{ x } """oops')).toBe('{ x } ')
  })
  it('未闭合普通字符串吞掉剩余', () => {
    expect(stripGqlStrings('{ x } "oops')).toBe('{ x } ')
  })
  it('# 注释被去掉', () => {
    expect(stripGqlStrings('{ x } # { comment\n{ y }')).toBe('{ x } \n{ y }')
  })
})

describe('validateGraphqlQuery', () => {
  it('空查询抛错', () => {
    expect(() => validateGraphqlQuery('  ')).toThrow('请输入 GraphQL 查询语句')
  })
  it('匿名查询与命名查询通过', () => {
    expect(() => validateGraphqlQuery('{ user { id } }')).not.toThrow()
    expect(() => validateGraphqlQuery('query Q($id: ID!) { user(id: $id) { id } }')).not.toThrow()
    expect(() => validateGraphqlQuery(INTROSPECTION_QUERY)).not.toThrow()
    expect(() => validateGraphqlQuery(DEFAULT_QUERY)).not.toThrow()
  })
  it('缺关键字抛错', () => {
    expect(() => validateGraphqlQuery('hello world')).toThrow('缺少 query/mutation/subscription')
  })
  it('括号不匹配抛错', () => {
    expect(() => validateGraphqlQuery('{ user { id }')).toThrow('未闭合')
    expect(() => validateGraphqlQuery('{ user } }')).toThrow('括号不匹配')
    expect(() => validateGraphqlQuery('query Q { user(id: 1] }')).toThrow('括号不匹配')
  })
  it('字符串内的括号不影响校验', () => {
    expect(() => validateGraphqlQuery('{ f(arg: "{") }')).not.toThrow()
  })
  it('fragment 关键字通过', () => {
    expect(() => validateGraphqlQuery('fragment F on T { x }')).not.toThrow()
  })
})

describe('parseVariables', () => {
  it('空串返回空对象', () => {
    expect(parseVariables('  ')).toEqual({})
  })
  it('合法 JSON 对象', () => {
    expect(parseVariables('{"a":1}')).toEqual({ a: 1 })
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseVariables('{')).toThrow('变量不是合法 JSON')
  })
  it('非对象抛错', () => {
    expect(() => parseVariables('[1]')).toThrow('变量必须是 JSON 对象')
  })
})

describe('sendGraphql', () => {
  it('非法端点直接抛错', async () => {
    const { fetchImpl } = mockFetch({})
    await expect(sendGraphql(req({ endpoint: 'bad' }), fetchImpl)).rejects.toThrow(
      '必须以 http:// 或 https:// 开头',
    )
  })
  it('非法查询直接抛错', async () => {
    const { fetchImpl } = mockFetch({})
    await expect(sendGraphql(req({ query: 'oops' }), fetchImpl)).rejects.toThrow('缺少 query')
  })
  it('非法变量直接抛错', async () => {
    const { fetchImpl } = mockFetch({})
    await expect(sendGraphql(req({ variables: '{' }), fetchImpl)).rejects.toThrow(
      '变量不是合法 JSON',
    )
  })
  it('POST 请求体结构正确', async () => {
    let captured: { url: string; init: RequestInit } | null = null
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      captured = { url, init }
      return { ok: true, status: 200, text: async () => '{"data":{"__typename":"Query"}}' }
    }) as unknown as FetchImpl
    const r = await sendGraphql(
      req({ query: 'query Q($id: ID!) { x }', variables: '{"id":"1"}', headers: { 'X-A': 'b' } }),
      fetchImpl,
    )
    expect(r.ok).toBe(true)
    expect(r.status).toBe(200)
    expect(r.data).toEqual({ __typename: 'Query' })
    expect(captured!.url).toBe('https://api.example.com/graphql')
    const headers = captured!.init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['X-A']).toBe('b')
    const body = JSON.parse(String(captured!.init.body))
    expect(body.query).toContain('query Q')
    expect(body.variables).toEqual({ id: '1' })
  })
  it('GraphQL errors 时 ok 为 false', async () => {
    const { fetchImpl } = mockFetch({
      text: '{"errors":[{"message":"bad"}],"data":null}',
    })
    const r = await sendGraphql(req(), fetchImpl)
    expect(r.ok).toBe(false)
    expect(r.errors).toEqual([{ message: 'bad' }])
    expect(r.data).toBeNull()
  })
  it('HTTP 错误状态 ok 为 false', async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 400, text: '{"data":null}' })
    const r = await sendGraphql(req(), fetchImpl)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(400)
  })
  it('网络错误返回中文 error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as FetchImpl
    const r = await sendGraphql(req(), fetchImpl)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('请求失败')
    expect(r.error).toContain('CORS')
  })
  it('非 JSON 响应返回中文 error', async () => {
    const { fetchImpl } = mockFetch({ text: '<html>oops' })
    const r = await sendGraphql(req(), fetchImpl)
    expect(r.error).toContain('响应不是合法 JSON')
  })
  it('非对象响应返回中文 error', async () => {
    const { fetchImpl } = mockFetch({ text: '[1,2]' })
    const r = await sendGraphql(req(), fetchImpl)
    expect(r.error).toContain('不是合法的 GraphQL 结果对象')
  })
})

describe('formatGraphqlResult', () => {
  it('错误直接返回', () => {
    expect(formatGraphqlResult({ ok: false, status: 0, durationMs: 1, error: '请求失败：x' })).toBe(
      '请求失败：x',
    )
  })
  it('data/errors 分开展示', async () => {
    const { fetchImpl } = mockFetch({ text: '{"data":{"a":1},"errors":[{"message":"w"}]}' })
    const out = formatGraphqlResult(await sendGraphql(req(), fetchImpl))
    expect(out).toContain('失败')
    expect(out).toContain('errors:')
    expect(out).toContain('data:')
    expect(out).toContain('"a": 1')
  })
  it('无 data 显示(无)', async () => {
    const { fetchImpl } = mockFetch({ text: '{}' })
    const out = formatGraphqlResult(await sendGraphql(req(), fetchImpl))
    expect(out).toContain('(无)')
    expect(out).not.toContain('errors:')
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
