/**
 * api-mock（#743）utils 单测：纯前端，无网络。
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REQUEST_LINE,
  compilePattern,
  errorMessage,
  formatResult,
  getByPath,
  matchMockRequest,
  matchRoute,
  parseJsonBody,
  parseRequestLine,
  renderTemplate,
  validateRoutes,
  type MockRequest,
  type MockRoute,
} from './utils'

function route(over: Partial<MockRoute> = {}): MockRoute {
  return {
    method: 'GET',
    pathPattern: '/users/:id',
    status: 200,
    headers: {},
    bodyTemplate: '{"id":"{{param.id}}"}',
    delayMs: 0,
    ...over,
  }
}

function req(over: Partial<MockRequest> = {}): MockRequest {
  return { method: 'GET', path: '/users/123', query: {}, body: undefined, ...over }
}

describe('parseRequestLine', () => {
  it('空行抛中文错', () => {
    expect(() => parseRequestLine('   ')).toThrow('请输入模拟请求行')
  })
  it('标准请求行解析方法/路径/查询', () => {
    const r = parseRequestLine('GET /users/123?active=true&n=2')
    expect(r.method).toBe('GET')
    expect(r.path).toBe('/users/123')
    expect(r.query).toEqual({ active: 'true', n: '2' })
  })
  it('缺方法时默认 GET', () => {
    const r = parseRequestLine('/users/123')
    expect(r.method).toBe('GET')
    expect(r.path).toBe('/users/123')
  })
  it('方法大小写归一化', () => {
    expect(parseRequestLine('post /x').method).toBe('POST')
  })
  it('目标不以 / 开头抛错', () => {
    expect(() => parseRequestLine('GET users/123')).toThrow('必须以 / 开头')
    expect(() => parseRequestLine('hello world')).toThrow('必须以 / 开头')
  })
  it('查询参数做 URL 解码', () => {
    const r = parseRequestLine('GET /s?q=a%20b')
    expect(r.query.q).toBe('a b')
  })
  it('默认请求行可解析', () => {
    expect(parseRequestLine(DEFAULT_REQUEST_LINE).path).toBe('/users/123')
  })
})

describe('compilePattern', () => {
  it('命名参数编译为捕获组', () => {
    const { regex, paramNames } = compilePattern('/users/:id')
    expect(paramNames).toEqual(['id'])
    expect(regex.test('/users/123')).toBe(true)
    expect(regex.test('/users/123/posts')).toBe(false)
  })
  it('空参数名抛错', () => {
    expect(() => compilePattern('/users/:')).toThrow('参数名不能为空')
  })
  it('* 通配任意后缀', () => {
    const { regex } = compilePattern('/static/*')
    expect(regex.test('/static/a/b.css')).toBe(true)
  })
  it('静态段中的正则字符按字面匹配', () => {
    const { regex } = compilePattern('/a.b')
    expect(regex.test('/a.b')).toBe(true)
    expect(regex.test('/axb')).toBe(false)
  })
})

describe('matchRoute', () => {
  it('* 方法通配任意方法', () => {
    expect(matchRoute(route({ method: '*' }), 'DELETE', '/users/1')).toEqual({ id: '1' })
  })
  it('方法大小写不敏感', () => {
    expect(matchRoute(route({ method: 'get' }), 'GET', '/users/1')).toEqual({ id: '1' })
  })
  it('方法不一致返回 null', () => {
    expect(matchRoute(route({ method: 'POST' }), 'GET', '/users/1')).toBeNull()
  })
  it('路径不一致返回 null', () => {
    expect(matchRoute(route(), 'GET', '/orders/1')).toBeNull()
  })
  it('参数做 decodeURIComponent 解码', () => {
    expect(matchRoute(route({ pathPattern: '/f/:name' }), 'GET', '/f/%E4%B8%AD')).toEqual({
      name: '中',
    })
  })
})

describe('getByPath', () => {
  it('空路径返回 undefined', () => {
    expect(getByPath({ a: 1 }, '')).toBeUndefined()
  })
  it('对象嵌套取值', () => {
    expect(getByPath({ a: { b: 2 } }, 'a.b')).toBe(2)
  })
  it('数组下标取值', () => {
    expect(getByPath({ list: ['x', 'y'] }, 'list.1')).toBe('y')
  })
  it('数组非数字下标返回 undefined', () => {
    expect(getByPath({ list: [1] }, 'list.a')).toBeUndefined()
  })
  it('中间为 null 返回 undefined', () => {
    expect(getByPath({ a: null }, 'a.b')).toBeUndefined()
  })
  it('中间为原始值返回 undefined', () => {
    expect(getByPath({ a: 1 }, 'a.b')).toBeUndefined()
  })
  it('缺失键返回 undefined', () => {
    expect(getByPath({}, 'a')).toBeUndefined()
  })
})

describe('renderTemplate', () => {
  const ctx = { query: { q: 'hi' }, param: { id: '7' }, body: { user: { name: 'n' }, n: 3 } }
  it('三类占位替换', () => {
    expect(renderTemplate('{{query.q}}-{{param.id}}-{{body.user.name}}', ctx)).toBe('hi-7-n')
  })
  it('数字转为字符串', () => {
    expect(renderTemplate('n={{body.n}}', ctx)).toBe('n=3')
  })
  it('对象转为 JSON', () => {
    expect(renderTemplate('{{body.user}}', ctx)).toBe('{"name":"n"}')
  })
  it('无占位原样返回', () => {
    expect(renderTemplate('plain', ctx)).toBe('plain')
  })
  it('不支持的作用域抛错', () => {
    expect(() => renderTemplate('{{foo.bar}}', ctx)).toThrow('不支持的模板变量')
  })
  it('缺少路径抛错', () => {
    expect(() => renderTemplate('{{query}}', ctx)).toThrow('缺少路径')
  })
  it('变量缺失抛错', () => {
    expect(() => renderTemplate('{{query.missing}}', ctx)).toThrow('模板变量缺失：query.missing')
    expect(() => renderTemplate('{{body.nope}}', ctx)).toThrow('模板变量缺失：body.nope')
  })
  it('null 值视为缺失', () => {
    expect(() => renderTemplate('{{body.user}}', { ...ctx, body: { user: null } })).toThrow(
      '模板变量缺失',
    )
  })
})

describe('validateRoutes', () => {
  it('非法 JSON 抛错', () => {
    expect(() => validateRoutes('{bad')).toThrow('不是合法 JSON')
  })
  it('非数组抛错', () => {
    expect(() => validateRoutes('{}')).toThrow('必须是数组')
  })
  it('空数组抛错', () => {
    expect(() => validateRoutes('[]')).toThrow('至少定义一条')
  })
  it('条目非对象抛错', () => {
    expect(() => validateRoutes('[1]')).toThrow('第 1 条路由必须是对象')
  })
  it('method 非空字符串校验', () => {
    expect(() => validateRoutes('[{"method":"","pathPattern":"/a","status":200}]')).toThrow(
      'method 必须是非空字符串',
    )
    expect(() => validateRoutes('[{"pathPattern":"/a","status":200}]')).toThrow(
      'method 必须是非空字符串',
    )
  })
  it('pathPattern 必须以 / 开头', () => {
    expect(() => validateRoutes('[{"method":"GET","pathPattern":"a","status":200}]')).toThrow(
      '必须是以 / 开头的字符串',
    )
  })
  it('status 范围与整数校验', () => {
    expect(() => validateRoutes('[{"method":"GET","pathPattern":"/a","status":99}]')).toThrow(
      '100–599 的整数',
    )
    expect(() => validateRoutes('[{"method":"GET","pathPattern":"/a","status":200.5}]')).toThrow(
      '100–599 的整数',
    )
    expect(() => validateRoutes('[{"method":"GET","pathPattern":"/a","status":"200"}]')).toThrow(
      '100–599 的整数',
    )
  })
  it('headers 校验', () => {
    expect(() =>
      validateRoutes('[{"method":"GET","pathPattern":"/a","status":200,"headers":[]}]'),
    ).toThrow('headers 必须是对象')
    expect(() =>
      validateRoutes('[{"method":"GET","pathPattern":"/a","status":200,"headers":{"x":1}}]'),
    ).toThrow('必须是字符串')
  })
  it('bodyTemplate 必须为字符串', () => {
    expect(() =>
      validateRoutes('[{"method":"GET","pathPattern":"/a","status":200,"bodyTemplate":1}]'),
    ).toThrow('bodyTemplate 必须是字符串')
  })
  it('delayMs 非负数字校验', () => {
    expect(() =>
      validateRoutes('[{"method":"GET","pathPattern":"/a","status":200,"delayMs":-1}]'),
    ).toThrow('不小于 0 的数字')
    expect(() =>
      validateRoutes('[{"method":"GET","pathPattern":"/a","status":200,"delayMs":"x"}]'),
    ).toThrow('不小于 0 的数字')
  })
  it('合法规则归一化默认值', () => {
    const [r] = validateRoutes('[{"method":"get","pathPattern":"/a","status":200}]')
    expect(r.method).toBe('GET')
    expect(r.headers).toEqual({})
    expect(r.bodyTemplate).toBe('')
    expect(r.delayMs).toBe(0)
  })
})

describe('parseJsonBody', () => {
  it('空串返回 undefined', () => {
    expect(parseJsonBody('  ')).toBeUndefined()
  })
  it('合法 JSON 解析', () => {
    expect(parseJsonBody('{"a":1}')).toEqual({ a: 1 })
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseJsonBody('{')).toThrow('请求体不是合法 JSON')
  })
})

describe('matchMockRequest', () => {
  it('命中首条路由并渲染模板', () => {
    const routes = validateRoutes(
      '[{"method":"GET","pathPattern":"/users/:id","status":200,"bodyTemplate":"id={{param.id}},q={{query.active}}"}]',
    )
    const r = matchMockRequest(routes, req({ query: { active: 'true' } }))
    expect(r.matched).toBe(true)
    expect(r.routeIndex).toBe(0)
    expect(r.body).toBe('id=123,q=true')
    expect(r.message).toContain('命中路由 #1')
  })
  it('跳过不匹配取第二条', () => {
    const routes = validateRoutes(
      '[{"method":"POST","pathPattern":"/users","status":201,"bodyTemplate":"ok"},{"method":"GET","pathPattern":"/users/:id","status":200,"bodyTemplate":"got {{param.id}}"}]',
    )
    const r = matchMockRequest(routes, req())
    expect(r.matched).toBe(true)
    expect(r.routeIndex).toBe(1)
    expect(r.body).toBe('got 123')
  })
  it('模板变量缺失返回未命中与中文原因', () => {
    const routes = validateRoutes(
      '[{"method":"GET","pathPattern":"/a","status":200,"bodyTemplate":"{{query.missing}}"}]',
    )
    const r = matchMockRequest(routes, req({ path: '/a' }))
    expect(r.matched).toBe(false)
    expect(r.message).toContain('模板变量缺失')
  })
  it('无匹配路由返回中文提示', () => {
    const r = matchMockRequest([route()], req({ path: '/nope' }))
    expect(r.matched).toBe(false)
    expect(r.routeIndex).toBe(-1)
    expect(r.message).toBe('无匹配的 mock 路由：GET /nope')
  })
})

describe('formatResult', () => {
  it('未命中直接返回 message', () => {
    const r = matchMockRequest([route()], req({ path: '/nope' }))
    expect(formatResult(r)).toBe(r.message)
  })
  it('命中含响应头', () => {
    const routes = validateRoutes(
      '[{"method":"GET","pathPattern":"/a","status":200,"headers":{"X-A":"b"},"bodyTemplate":"hi"}]',
    )
    const out = formatResult(matchMockRequest(routes, req({ path: '/a' })))
    expect(out).toContain('状态：200')
    expect(out).toContain('X-A: b')
    expect(out).toContain('hi')
  })
  it('空响应体显示(空)', () => {
    const routes = validateRoutes('[{"method":"GET","pathPattern":"/a","status":204}]')
    const out = formatResult(matchMockRequest(routes, req({ path: '/a' })))
    expect(out).toContain('(空)')
    expect(out).not.toContain('响应头')
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

describe('validateRoutes 补充', () => {
  it('合法 delayMs 被保留', () => {
    const [r] = validateRoutes(
      '[{"method":"GET","pathPattern":"/a","status":200,"delayMs":150}]',
    )
    expect(r.delayMs).toBe(150)
  })
})
