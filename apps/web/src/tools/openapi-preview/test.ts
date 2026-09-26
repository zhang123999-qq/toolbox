import { describe, expect, it } from 'vitest'
import type { OpenapiPreviewInput } from './schema'
import { renderOpenApi, transform } from './utils'

const input = (text: string): OpenapiPreviewInput => ({ text })

const DOC = {
  openapi: '3.0.3',
  info: { title: 'API', version: '1.0.0' },
  paths: {
    '/users': {
      get: { summary: 'list', parameters: [{ name: 'page', in: 'query' }], responses: { 200: {} } },
      post: { requestBody: { content: { 'application/json': {} } }, responses: { 201: {} } },
    },
    '/users/{id}': {
      get: {
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: { 200: {}, 404: {} },
      },
    },
  },
}

describe('openapi-preview / renderOpenApi', () => {
  it('列出标题、版本与路径方法', () => {
    const out = renderOpenApi(DOC)
    expect(out).toContain('标题：API')
    expect(out).toContain('GET /users')
    expect(out).toContain('POST /users')
    expect(out).toContain('GET /users/{id}')
  })

  it('展示参数与必填', () => {
    const out = renderOpenApi(DOC)
    expect(out).toContain('page（in=query')
    expect(out).toContain('id（in=path, 必填）')
  })

  it('展示请求体 mime 与响应码', () => {
    const out = renderOpenApi(DOC)
    expect(out).toContain('application/json')
    expect(out).toContain('响应：200, 404')
  })

  it('缺少 paths 报错', () => {
    expect(() => renderOpenApi({ openapi: '3.0.0' })).toThrow(/缺少 paths/)
  })

  it('非对象报错', () => {
    expect(() => renderOpenApi([1, 2])).toThrow(/JSON 对象/)
  })
})

describe('openapi-preview / transform', () => {
  it('空输入返回空串', () => {
    expect(transform(input('   '), {})).toBe('')
  })

  it('端到端渲染', () => {
    expect(transform(input(JSON.stringify(DOC)), {})).toContain('共 2 条路径')
  })

  it('非法 JSON 报错', () => {
    expect(() => transform(input('{oops'), {})).toThrow(/JSON/)
  })

  it('超长输入报错', () => {
    expect(() => transform(input('x'.repeat(200001)), {})).toThrow(/上限/)
  })
})
