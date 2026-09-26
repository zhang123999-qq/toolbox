import { describe, expect, it } from 'vitest'
import type { PostmanToCodeOptions } from './schema'
import { flattenRequests, snippet, transform } from './utils'

const base: PostmanToCodeOptions = { language: 'fetch' }

const COLLECTION = {
  item: [
    {
      name: 'a',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        header: [{ key: 'Accept', value: 'application/json' }],
      },
    },
    {
      name: 'folder',
      item: [
        {
          request: {
            method: 'POST',
            url: { raw: 'https://api.example.com/users' },
            body: { mode: 'raw', raw: '{"a":1}' },
          },
        },
      ],
    },
  ],
}

describe('postman-to-code / flattenRequests', () => {
  it('拍平文件夹里的请求', () => {
    const reqs = flattenRequests(COLLECTION)
    expect(reqs).toHaveLength(2)
  })
  it('缺 item 报错', () => {
    expect(() => flattenRequests({})).toThrow(/item 数组/)
  })
  it('空集合报错', () => {
    expect(() => flattenRequests({ item: [] })).toThrow(/没有任何请求/)
  })
})

describe('postman-to-code / snippet', () => {
  const req = flattenRequests(COLLECTION)[1]
  it('fetch 片段', () => {
    const out = snippet(req, 'fetch')
    expect(out).toContain("fetch('https://api.example.com/users'")
    expect(out).toContain("method: 'POST'")
    expect(out).toContain('body:')
  })
  it('python 片段', () => {
    expect(snippet(req, 'python')).toContain('requests.post')
  })
  it('curl 片段', () => {
    expect(snippet(req, 'curl')).toContain('curl -X POST')
  })
})

describe('postman-to-code / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('端到端列出每个请求', () => {
    const out = transform({ text: JSON.stringify(COLLECTION) }, base)
    expect(out).toContain('### GET https://api.example.com/users')
    expect(out).toContain('### POST https://api.example.com/users')
  })
  it('非法 JSON 报错', () => {
    expect(() => transform({ text: '{oops' }, base)).toThrow(/JSON/)
  })
  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
