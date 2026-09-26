import { describe, expect, it } from 'vitest'
import type { CorsConfigOptions } from './schema'
import {
  assertOptions,
  buildExpress,
  buildHeaders,
  buildNginx,
  methodsValue,
  originValue,
  splitList,
  transform,
} from './utils'

const base: CorsConfigOptions = {
  originMode: 'specific',
  originList: 'https://example.com',
  methods: '',
  headers: '',
  credentials: false,
  maxAge: '',
}

describe('cors-config / splitList', () => {
  it('逗号与换行分隔，去空项与空白', () => {
    expect(splitList('a, b,,\nc')).toEqual(['a', 'b', 'c'])
    expect(splitList('  ')).toEqual([])
  })
})

describe('cors-config / originValue', () => {
  it('allow-all 返回 *', () => {
    expect(originValue({ ...base, originMode: 'allow-all' })).toBe('*')
  })
  it('same-origin 不输出 ACAO', () => {
    expect(originValue({ ...base, originMode: 'same-origin' })).toBeNull()
  })
  it('specific 列出给定 Origin', () => {
    expect(originValue({ ...base, originList: 'https://a.com, https://b.com' })).toBe(
      'https://a.com, https://b.com',
    )
  })
})

describe('cors-config / 默认值', () => {
  it('methods / headers 留空时用默认值', () => {
    expect(methodsValue(base)).toBe('GET, POST, PUT, DELETE, PATCH')
    expect(buildHeaders(base)).toContain(
      'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH',
    )
  })
})

describe('cors-config / assertOptions', () => {
  it('指定来源但列表为空报错', () => {
    expect(() => assertOptions({ ...base, originList: '  ' })).toThrow(/至少填一个/)
  })
  it('* 与 credentials 不能共存', () => {
    expect(() => assertOptions({ ...base, originMode: 'allow-all', credentials: true })).toThrow(
      /不能同时/,
    )
  })
  it('maxAge 必须是整数', () => {
    expect(() => assertOptions({ ...base, maxAge: 'abc' })).toThrow(/max-age/)
    expect(() => assertOptions({ ...base, maxAge: '600' })).not.toThrow()
  })
  it('Origin 必须是 http(s):// 开头', () => {
    expect(() => assertOptions({ ...base, originList: 'javascript:alert(1)' })).toThrow(/http/)
    expect(() => assertOptions({ ...base, originList: 'https://a.com' })).not.toThrow()
  })
  it('Origin/方法/头拒绝换行与引号注入', () => {
    expect(() => assertOptions({ ...base, originList: 'https://a.com\nadd_header X 1;' })).toThrow()
    expect(() => assertOptions({ ...base, methods: 'GET\nadd_header' })).toThrow()
    expect(() => assertOptions({ ...base, headers: 'X-Head"bad' })).toThrow()
  })
})

describe('cors-config / 片段', () => {
  it('credentials 输出 Allow-Credentials 头', () => {
    expect(buildHeaders({ ...base, credentials: true })).toContain(
      'Access-Control-Allow-Credentials: true',
    )
  })
  it('maxAge 输出 Max-Age', () => {
    expect(buildHeaders({ ...base, maxAge: '600' })).toContain('Access-Control-Max-Age: 600')
  })
  it('Nginx 与 Express 片段都生成', () => {
    expect(buildNginx(base)).toContain('location /api/ {')
    expect(buildExpress(base)).toContain('app.use((req, res, next) => {')
  })
})

describe('cors-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('输出含响应头/Nginx/Express 三段', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('# 响应头')
    expect(out).toContain('# Nginx')
    expect(out).toContain('# Express / Node.js')
  })
  it('非法配置抛中文错误', () => {
    expect(() => transform({ text: 'x' }, { ...base, originList: '' })).toThrow(/至少填一个/)
  })
})
