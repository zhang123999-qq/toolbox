/**
 * postman-import（#751）utils 单测：纯前端，无网络。
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLLECTION_JSON,
  errorMessage,
  extractBody,
  extractHeaders,
  extractQuery,
  formatRequestList,
  parsePostmanCollection,
  resolveCollectionUrl,
  toAssertTask,
} from './utils'

describe('resolveCollectionUrl', () => {
  it('字符串 URL 直接返回', () => {
    expect(resolveCollectionUrl('https://x.com/a')).toBe('https://x.com/a')
  })
  it('空字符串抛错', () => {
    expect(() => resolveCollectionUrl('  ')).toThrow('请求缺少 URL')
  })
  it('非对象抛错', () => {
    expect(() => resolveCollectionUrl(123)).toThrow('请求缺少 URL')
    expect(() => resolveCollectionUrl(null)).toThrow('请求缺少 URL')
  })
  it('raw 优先', () => {
    expect(resolveCollectionUrl({ raw: 'https://x.com/a?b=1', host: ['y.com'] })).toBe(
      'https://x.com/a?b=1',
    )
  })
  it('host/path 数组拼接', () => {
    expect(
      resolveCollectionUrl({ protocol: 'http', host: ['a', 'b.com'], path: ['x', 'y'] }),
    ).toBe('http://a.b.com/x/y')
  })
  it('host 字符串与默认协议', () => {
    expect(resolveCollectionUrl({ host: 'x.com', path: 'a' })).toBe('https://x.com/a')
  })
  it('无 path 时不加斜杠', () => {
    expect(resolveCollectionUrl({ host: ['x.com'] })).toBe('https://x.com')
  })
  it('缺少 host 抛错', () => {
    expect(() => resolveCollectionUrl({ path: ['a'] })).toThrow('URL 对象缺少 host')
  })
})

describe('extractQuery', () => {
  it('URL 字符串解析查询串', () => {
    expect(extractQuery('https://x.com/a?b=1&c=hi%20x')).toEqual({ b: '1', c: 'hi x' })
  })
  it('无查询串返回空对象', () => {
    expect(extractQuery('https://x.com/a')).toEqual({})
  })
  it('URL 对象 query 数组', () => {
    expect(
      extractQuery({ query: [{ key: 'a', value: '1' }, { key: 'b', disabled: true }] }),
    ).toEqual({ a: '1' })
  })
  it('非法 query 项跳过', () => {
    expect(extractQuery({ query: ['x', { key: 'a' }] })).toEqual({ a: '' })
  })
  it('非对象返回空对象', () => {
    expect(extractQuery(123)).toEqual({})
    expect(extractQuery({})).toEqual({})
  })
})

describe('extractHeaders', () => {
  it('数组形式提取', () => {
    expect(extractHeaders([{ key: 'A', value: '1' }, { key: 'B' }])).toEqual({ A: '1', B: '' })
  })
  it('disabled 跳过', () => {
    expect(extractHeaders([{ key: 'A', value: '1', disabled: true }])).toEqual({})
  })
  it('name 兜底与空键跳过', () => {
    expect(extractHeaders([{ name: 'X', value: 'v' }, { value: 'v' }])).toEqual({ X: 'v' })
  })
  it('非对象项跳过', () => {
    expect(extractHeaders(['x'])).toEqual({})
  })
  it('对象形式', () => {
    expect(extractHeaders({ A: '1', B: 2 })).toEqual({ A: '1', B: '2' })
  })
  it('非法输入返回空对象', () => {
    expect(extractHeaders(null)).toEqual({})
    expect(extractHeaders('x')).toEqual({})
  })
})

describe('extractBody', () => {
  it('空值返回空串', () => {
    expect(extractBody(undefined)).toBe('')
    expect(extractBody(null)).toBe('')
  })
  it('字符串直接返回', () => {
    expect(extractBody('raw-body')).toBe('raw-body')
  })
  it('非对象返回空串', () => {
    expect(extractBody(123)).toBe('')
  })
  it('raw 模式', () => {
    expect(extractBody({ mode: 'raw', raw: '{"a":1}' })).toBe('{"a":1}')
    expect(extractBody({ mode: 'raw' })).toBe('')
  })
  it('urlencoded 转查询串', () => {
    expect(
      extractBody({
        mode: 'urlencoded',
        urlencoded: [{ key: 'a', value: '1' }, { key: 'b', disabled: true }, 'x'],
      }),
    ).toBe('a=1')
  })
  it('urlencoded 非数组返回空串', () => {
    expect(extractBody({ mode: 'urlencoded' })).toBe('')
  })
  it('form-data/file 抛中文错', () => {
    expect(() => extractBody({ mode: 'formdata' })).toThrow('暂不支持 formdata')
    expect(() => extractBody({ mode: 'file' })).toThrow('暂不支持 file')
  })
  it('未知 mode 返回空串', () => {
    expect(extractBody({ mode: 'graphql' })).toBe('')
  })
})

describe('parsePostmanCollection', () => {
  it('空文本抛错', () => {
    expect(() => parsePostmanCollection('  ')).toThrow('请粘贴 Postman Collection JSON')
  })
  it('非法 JSON 抛错', () => {
    expect(() => parsePostmanCollection('{')).toThrow('不是合法的 Postman Collection JSON')
  })
  it('顶层非对象抛错', () => {
    expect(() => parsePostmanCollection('[1]')).toThrow('顶层必须是对象')
  })
  it('schema 不匹配抛错', () => {
    expect(() => parsePostmanCollection('{"info":{}}')).toThrow('info.schema 不匹配')
    expect(() =>
      parsePostmanCollection('{"info":{"schema":"https://x/collection/v1/collection.json"}}'),
    ).toThrow('info.schema 不匹配')
  })
  it('缺少 item 数组抛错', () => {
    expect(() =>
      parsePostmanCollection(
        '{"info":{"schema":"https://schema.getpostman.com/json/collection/v2.1.0/collection.json"}}',
      ),
    ).toThrow('缺少 item 数组')
  })
  it('默认示例解析出 2 个请求', () => {
    const r = parsePostmanCollection(DEFAULT_COLLECTION_JSON)
    expect(r.collectionName).toBe('示例集合')
    expect(r.requests.length).toBe(2)
    const [get, post] = r.requests
    expect(get.name).toBe('用户 / 获取用户')
    expect(get.method).toBe('GET')
    expect(get.url).toBe('https://api.example.com/users/123?active=true')
    expect(get.query).toEqual({ active: 'true' })
    expect(get.headers).toEqual({ Accept: 'application/json' })
    expect(post.name).toBe('创建用户')
    expect(post.method).toBe('POST')
    expect(post.body).toBe('{"name": "Tom"}')
  })
  it('未命名集合与请求兜底', () => {
    const r = parsePostmanCollection(
      '{"info":{"schema":"x/collection/v2.1/y"},"item":[{"request":{"url":"https://x.com"}}]}',
    )
    expect(r.collectionName).toBe('未命名集合')
    expect(r.requests[0].name).toBe('未命名')
    expect(r.requests[0].method).toBe('GET')
  })
  it('字符串形式 request', () => {
    const r = parsePostmanCollection(
      '{"info":{"schema":"x/collection/v2.1/y"},"item":[{"name":"r","request":"https://x.com/a?b=1"}]}',
    )
    expect(r.requests[0].method).toBe('GET')
    expect(r.requests[0].query).toEqual({ b: '1' })
  })
  it('request 非对象抛错', () => {
    expect(() =>
      parsePostmanCollection(
        '{"info":{"schema":"x/collection/v2.1/y"},"item":[{"name":"r","request":123}]}',
      ),
    ).toThrow('缺少 request 对象')
  })
  it('无 item 无 request 的条目跳过', () => {
    const r = parsePostmanCollection(
      '{"info":{"schema":"x/collection/v2.1/y"},"item":["x",{}, {"name":"r","request":"https://x.com"}]}',
    )
    expect(r.requests.length).toBe(1)
  })
  it('深层嵌套文件夹', () => {
    const r = parsePostmanCollection(
      '{"info":{"schema":"x/collection/v2.1/y"},"item":[{"name":"a","item":[{"name":"b","item":[{"name":"c","request":"https://x.com"}]}]}]}',
    )
    expect(r.requests[0].name).toBe('a / b / c')
  })
})

describe('toAssertTask', () => {
  it('生成 #748 可用的断言任务 JSON', () => {
    const json = toAssertTask({
      name: 'r',
      method: 'POST',
      url: 'https://x.com',
      headers: { 'Content-Type': 'application/json' },
      query: {},
      body: '{}',
    })
    const task = JSON.parse(json)
    expect(task.url).toBe('https://x.com')
    expect(task.method).toBe('POST')
    expect(task.headers).toContain('Content-Type: application/json')
    expect(task.assertions).toEqual([
      { type: 'statusRange', min: 200, max: 299 },
      { type: 'timeLt', ms: 5000 },
    ])
  })
  it('无请求头时 headers 为空串', () => {
    const task = JSON.parse(
      toAssertTask({ name: 'r', method: 'GET', url: 'https://x.com', headers: {}, query: {}, body: '' }),
    )
    expect(task.headers).toBe('')
  })
})

describe('formatRequestList', () => {
  it('摘要含集合名与请求行', () => {
    const out = formatRequestList(parsePostmanCollection(DEFAULT_COLLECTION_JSON))
    expect(out).toContain('示例集合，共 2 个请求')
    expect(out).toContain('1. [GET] 用户 / 获取用户')
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

describe('extractBody 补充', () => {
  it('urlencoded 非字符串值转空串', () => {
    expect(
      extractBody({ mode: 'urlencoded', urlencoded: [{ key: 'a', value: 1 }] }),
    ).toBe('a=')
  })
})
