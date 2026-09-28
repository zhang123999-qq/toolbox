/**
 * openapi-lint（#745）utils 单测：纯前端，无网络。
 */
import { describe, expect, it } from 'vitest'
import {
  errorMessage,
  formatLintReport,
  lintOpenApi,
  parseSimpleYaml,
  parseSpec,
  resolveLocalRef,
  stripComment,
} from './utils'

const GOOD_SPEC = {
  openapi: '3.0.0',
  info: { title: 'T', version: '1' },
  paths: {
    '/users/{id}': {
      get: {
        summary: '获取用户',
        operationId: 'getUser',
        parameters: [{ name: 'id', in: 'path', required: true, description: 'ID' }],
        responses: { 200: { description: 'ok' } },
      },
    },
  },
}

describe('stripComment', () => {
  it('整行注释被去掉', () => {
    expect(stripComment('# comment')).toBe('')
  })
  it('行尾注释被去掉', () => {
    expect(stripComment('key: value # 注')).toBe('key: value ')
  })
  it('双引号内的 # 保留', () => {
    expect(stripComment('key: "a#b" # c')).toBe('key: "a#b" ')
  })
  it("单引号内的 # 保留", () => {
    expect(stripComment("key: 'a#b'")).toBe("key: 'a#b'")
  })
  it('转义引号不切换状态', () => {
    expect(stripComment('key: "a\\"b" # c')).toBe('key: "a\\"b" ')
  })
  it('无注释原样返回', () => {
    expect(stripComment('key: value')).toBe('key: value')
  })
})

describe('parseSimpleYaml', () => {
  it('空内容抛错', () => {
    expect(() => parseSimpleYaml('  \n # x')).toThrow('YAML 内容为空')
  })
  it('简单映射', () => {
    expect(parseSimpleYaml('a: 1\nb: hello')).toEqual({ a: 1, b: 'hello' })
  })
  it('嵌套映射', () => {
    expect(parseSimpleYaml('a:\n  b:\n    c: 2')).toEqual({ a: { b: { c: 2 } } })
  })
  it('无子节点的 key 视为 null', () => {
    expect(parseSimpleYaml('a:\nb: 1')).toEqual({ a: null, b: 1 })
  })
  it('标量列表', () => {
    expect(parseSimpleYaml('- 1\n- true\n- null\n- ~\n- 1.5\n- text')).toEqual([
      1,
      true,
      null,
      null,
      1.5,
      'text',
    ])
  })
  it('对象列表（- key: value 续行合并）', () => {
    const v = parseSimpleYaml('- name: a\n  age: 1\n- name: b\n  age: 2')
    expect(v).toEqual([
      { name: 'a', age: 1 },
      { name: 'b', age: 2 },
    ])
  })
  it('key 下挂列表', () => {
    expect(parseSimpleYaml('paths:\n  - /a\n  - /b')).toEqual({ paths: ['/a', '/b'] })
  })
  it('独立 - 项挂缩进块', () => {
    expect(parseSimpleYaml('-\n  a: 1')).toEqual([{ a: 1 }])
  })
  it('独立 - 项无缩进内容抛错', () => {
    expect(() => parseSimpleYaml('-\n- 1')).toThrow('缺少缩进内容')
  })
  it('引号与转义', () => {
    expect(parseSimpleYaml('a: "x\\"y\\nz"\nb: \'it\'\'s\'')).toEqual({ a: 'x"y\nz', b: "it's" })
  })
  it('映射行缺少冒号抛错', () => {
    expect(() => parseSimpleYaml('just text')).toThrow('缺少冒号')
  })
  it('缩进续行缺少冒号抛错', () => {
    expect(() => parseSimpleYaml('- name: a\n  oops')).toThrow('缺少冒号')
  })
  it('缩进不一致抛错', () => {
    expect(() => parseSimpleYaml('a: 1\n b: 2\nc: 3')).toThrow('缩进不一致')
  })
  it('注释被忽略', () => {
    expect(parseSimpleYaml('# head\na: 1 # tail')).toEqual({ a: 1 })
  })
})

describe('parseSpec', () => {
  it('空文本抛错', () => {
    expect(() => parseSpec('   ')).toThrow('请粘贴 OpenAPI 规范内容')
  })
  it('JSON 优先解析', () => {
    expect(parseSpec('{"a": 1}')).toEqual({ a: 1 })
  })
  it('YAML 回退解析', () => {
    expect(parseSpec('openapi: 3.0.0')).toEqual({ openapi: '3.0.0' })
  })
  it('两者皆失败抛中文错', () => {
    expect(() => parseSpec('a: 1\n b: 2\nc: 3')).toThrow('不是合法的 JSON 或 YAML')
  })
})

describe('resolveLocalRef', () => {
  const spec = { components: { schemas: { 'a/b': { type: 'object' } } } }
  it('非本地 ref 返回 undefined', () => {
    expect(resolveLocalRef(spec, 'https://x.com/s.json')).toBeUndefined()
  })
  it('正常解析', () => {
    expect(resolveLocalRef({ a: { b: 1 } }, '#/a/b')).toBe(1)
  })
  it('~1 转义为斜杠', () => {
    expect(resolveLocalRef(spec, '#/components/schemas/a~1b')).toEqual({ type: 'object' })
  })
  it('中间非对象返回 undefined', () => {
    expect(resolveLocalRef({ a: 1 }, '#/a/b')).toBeUndefined()
  })
  it('缺失键返回 undefined', () => {
    expect(resolveLocalRef({}, '#/a')).toBeUndefined()
  })
})

describe('lintOpenApi', () => {
  it('顶层非对象直接 0 分', () => {
    const r = lintOpenApi([1])
    expect(r.score).toBe(0)
    expect(r.issues[0].message).toContain('顶层必须是对象')
  })
  it('规范良好的评 100 分', () => {
    const r = lintOpenApi(GOOD_SPEC)
    expect(r.issues).toEqual([])
    expect(r.score).toBe(100)
    expect(r.summary).toContain('0 个错误')
  })
  it('openapi 版本非法', () => {
    const r = lintOpenApi({ ...GOOD_SPEC, openapi: '2.0' })
    expect(r.issues.some((i) => i.message.includes('仅支持 OpenAPI 3.x'))).toBe(true)
  })
  it('缺少 info 报 error', () => {
    const { info: _dropped, ...rest } = GOOD_SPEC
    const r = lintOpenApi(rest)
    expect(r.issues.some((i) => i.path === 'info' && i.severity === 'error')).toBe(true)
  })
  it('info 缺 title/version 报 warning', () => {
    const r = lintOpenApi({ ...GOOD_SPEC, info: {} })
    expect(r.issues.filter((i) => i.severity === 'warning').length).toBe(2)
  })
  it('paths 缺失报 error', () => {
    const r = lintOpenApi({ openapi: '3.0.0', info: { title: 't', version: '1' } })
    expect(r.issues.some((i) => i.path === 'paths' && i.severity === 'error')).toBe(true)
  })
  it('大写/下划线路径建议 kebab-case', () => {
    const spec = {
      ...GOOD_SPEC,
      paths: {
        '/UserList': { get: { summary: 's', operationId: 'a', responses: { 200: { description: 'ok' } } } },
        '/user_list': { get: { summary: 's', operationId: 'b', responses: { 200: { description: 'ok' } } } },
        '/users/{userId}': { get: { summary: 's', operationId: 'c', responses: { 200: { description: 'ok' } } } },
      },
    }
    const r = lintOpenApi(spec)
    expect(r.issues.filter((i) => i.message.includes('kebab-case')).length).toBe(2)
  })
  it('路径项非对象跳过', () => {
    const r = lintOpenApi({ ...GOOD_SPEC, paths: { '/a': 1 } })
    expect(r.issues.some((i) => i.message.includes('路径项不是对象'))).toBe(true)
  })
  it('operation 非对象跳过', () => {
    const r = lintOpenApi({ ...GOOD_SPEC, paths: { '/a': { get: 'x' } } })
    expect(r.issues.some((i) => i.message.includes('operation 不是对象'))).toBe(true)
  })
  it('缺 summary/description 报 warning', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: { '/a': { get: { operationId: 'x', responses: { 200: { description: 'ok' } } } } },
    })
    expect(r.issues.some((i) => i.message.includes('缺少 summary/description'))).toBe(true)
  })
  it('重复 operationId 报 error', () => {
    const op = { summary: 's', operationId: 'dup', responses: { 200: { description: 'ok' } } }
    const r = lintOpenApi({ ...GOOD_SPEC, paths: { '/a': { get: op }, '/b': { get: op } } })
    expect(r.issues.some((i) => i.message.includes('重复的 operationId'))).toBe(true)
  })
  it('缺 operationId 给 info 提示', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: { '/a': { get: { summary: 's', responses: { 200: { description: 'ok' } } } } },
    })
    expect(r.issues.some((i) => i.severity === 'info' && i.message.includes('operationId'))).toBe(true)
  })
  it('parameters 非数组报 error', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: {
        '/a': { get: { summary: 's', operationId: 'x', parameters: {}, responses: { 200: { description: 'ok' } } } },
      },
    })
    expect(r.issues.some((i) => i.message.includes('parameters 必须是数组'))).toBe(true)
  })
  it('参数逐项校验', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: {
        '/a': {
          get: {
            summary: 's',
            operationId: 'x',
            parameters: [
              'nope',
              { in: 'query', description: 'd' },
              { name: 'n', in: 'weird', description: 'd' },
              { name: 'n', in: 'query' },
              { name: 'id', in: 'path', description: 'd' },
            ],
            responses: { 200: { description: 'ok' } },
          },
        },
      },
    })
    const msgs = r.issues.map((i) => i.message)
    expect(msgs.some((m) => m.includes('参数不是对象'))).toBe(true)
    expect(msgs.some((m) => m.includes('参数缺少 name'))).toBe(true)
    expect(msgs.some((m) => m.includes('参数 in 非法'))).toBe(true)
    expect(msgs.some((m) => m.includes('参数缺少 description'))).toBe(true)
    expect(msgs.some((m) => m.includes('path 参数建议 required'))).toBe(true)
  })
  it('requestBody $ref 可解析无警告', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/a': {
          post: {
            summary: 's',
            operationId: 'op1',
            requestBody: { $ref: '#/components/requestBodies/R' },
            responses: { 200: { description: 'ok' } },
          },
        },
      },
      components: { requestBodies: { R: { content: { 'application/json': {} } } } },
    }
    expect(lintOpenApi(spec).issues).toEqual([])
  })
  it('requestBody $ref 不可解析报 warning', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: {
        '/a': {
          post: {
            summary: 's',
            operationId: 'x',
            requestBody: { $ref: '#/components/requestBodies/Missing' },
            responses: { 200: { description: 'ok' } },
          },
        },
      },
    })
    expect(r.issues.some((i) => i.message.includes('requestBody 的 $ref 无法解析'))).toBe(true)
  })
  it('requestBody 缺少 content 报 warning', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: {
        '/a': {
          post: { summary: 's', operationId: 'x', requestBody: {}, responses: { 200: { description: 'ok' } } },
        },
      },
    })
    expect(r.issues.some((i) => i.message.includes('requestBody 缺少 content'))).toBe(true)
  })
  it('缺少 responses 报 error', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: { '/a': { get: { summary: 's', operationId: 'x' } } },
    })
    expect(r.issues.some((i) => i.severity === 'error' && i.message.includes('缺少 responses'))).toBe(true)
  })
  it('响应 $ref 不可解析与缺 description', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: {
        '/a': {
          get: {
            summary: 's',
            operationId: 'x',
            responses: { 200: { $ref: '#/nope' }, 201: {} },
          },
        },
      },
    })
    const msgs = r.issues.map((i) => i.message)
    expect(msgs.some((m) => m.includes('$ref 无法解析'))).toBe(true)
    expect(msgs.some((m) => m.includes('响应缺少 description'))).toBe(true)
  })
  it('无 2xx 响应报 warning', () => {
    const r = lintOpenApi({
      ...GOOD_SPEC,
      paths: {
        '/a': { get: { summary: 's', operationId: 'x', responses: { 400: { description: 'bad' } } } },
      },
    })
    expect(r.issues.some((i) => i.message.includes('缺少 2xx 成功响应'))).toBe(true)
  })
  it('评分按错误/警告扣分且不为负', () => {
    const r = lintOpenApi('not-an-object')
    expect(r.score).toBeGreaterThanOrEqual(0)
    const bad = lintOpenApi({ openapi: '2.0' })
    expect(bad.score).toBeLessThan(100)
  })
})

describe('formatLintReport', () => {
  it('无问题显示良好', () => {
    expect(formatLintReport(lintOpenApi(GOOD_SPEC))).toContain('规范良好')
  })
  it('问题带中文级别标签', () => {
    const out = formatLintReport(lintOpenApi({ openapi: '2.0' }))
    expect(out).toContain('[错误]')
    expect(out).toContain('仅支持 OpenAPI 3.x')
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

describe('parseSimpleYaml 补充', () => {
  it('false 标量', () => {
    expect(parseSimpleYaml('a: false')).toEqual({ a: false })
  })
  it('列表后可跟同级键', () => {
    expect(parseSimpleYaml('items:\n  - a\n  - b\nother: 1')).toEqual({
      items: ['a', 'b'],
      other: 1,
    })
  })
  it('- key: 空值视为 null', () => {
    expect(parseSimpleYaml('- name:\n  age: 1')).toEqual([{ name: null, age: 1 }])
  })
  it('列表项内缩进嵌套块', () => {
    expect(parseSimpleYaml('- name: a\n  meta:\n    x: 1')).toEqual([
      { name: 'a', meta: { x: 1 } },
    ])
  })
  it('列表项内空 key 视为 null', () => {
    expect(parseSimpleYaml('- name: a\n  empty:\n- name: b')).toEqual([
      { name: 'a', empty: null },
      { name: 'b' },
    ])
  })
})
