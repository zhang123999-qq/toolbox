/**
 * api-doc（#756）utils 单测：定义校验与 Markdown 文档生成（纯本地）。
 */
import { describe, expect, it } from 'vitest'
import {
  anchorOf,
  escapeMdCell,
  generateApiDoc,
  normalizeApiDef,
  parseApiDefs,
  type ApiDef,
} from './utils'

function def(over: Partial<ApiDef> = {}): ApiDef {
  return {
    name: '获取用户',
    method: 'GET',
    path: '/api/users/{id}',
    description: '查询用户',
    headers: [{ name: 'Authorization', required: true, description: 'Bearer 令牌' }],
    queryParams: [{ name: 'verbose', type: 'boolean', required: false, description: '是否详情' }],
    bodyExample: '{"name":"x"}',
    responseExample: '{"id":1}',
    ...over,
  }
}

describe('normalizeApiDef', () => {
  it('非对象抛错', () => {
    expect(() => normalizeApiDef(null)).toThrow('必须是对象')
    expect(() => normalizeApiDef('x')).toThrow('必须是对象')
  })
  it('名称为空抛错', () => {
    expect(() => normalizeApiDef({ name: ' ', method: 'GET', path: '/' })).toThrow(
      '接口名称不能为空',
    )
  })
  it('method 非法抛错', () => {
    expect(() => normalizeApiDef({ name: 'a', method: 'FETCH', path: '/' })).toThrow('method 非法')
  })
  it('method 非字符串抛错', () => {
    expect(() => normalizeApiDef({ name: 'a', method: 42, path: '/' })).toThrow('method 非法')
  })
  it('字符串字段原样保留', () => {
    const d = normalizeApiDef({
      name: 'a',
      method: 'GET',
      path: '/',
      description: 'desc',
      bodyExample: '{}',
      responseExample: '[]',
      queryParams: [{ name: 'q', type: 'number', required: true, description: 'd' }],
    })
    expect(d.description).toBe('desc')
    expect(d.bodyExample).toBe('{}')
    expect(d.responseExample).toBe('[]')
    expect(d.queryParams).toEqual([{ name: 'q', type: 'number', required: true, description: 'd' }])
  })
  it('非字符串字段补默认', () => {
    const d = normalizeApiDef({
      name: 'a',
      method: 'GET',
      path: '/',
      description: 5,
      bodyExample: 1,
      responseExample: null,
    })
    expect(d.description).toBe('')
    expect(d.bodyExample).toBe('')
    expect(d.responseExample).toBe('')
  })
  it('header name 非字符串被过滤', () => {
    const d = normalizeApiDef({
      name: 'a',
      method: 'GET',
      path: '/',
      headers: [{ name: 5, required: true }],
    })
    expect(d.headers).toEqual([])
  })
  it('queryParam name 非字符串被过滤、type 空字符串缺省', () => {
    const d = normalizeApiDef({
      name: 'a',
      method: 'GET',
      path: '/',
      queryParams: [{ name: 5 }, { name: 'q', type: '' }],
    })
    expect(d.queryParams).toEqual([{ name: 'q', type: 'string', required: false, description: '' }])
  })
  it('method 大小写兼容', () => {
    expect(normalizeApiDef({ name: 'a', method: 'post', path: '/' }).method).toBe('POST')
  })
  it('path 必须以 / 开头', () => {
    expect(() => normalizeApiDef({ name: 'a', method: 'GET', path: 'api' })).toThrow(
      'path 必须以 / 开头',
    )
  })
  it('缺字段补默认', () => {
    const d = normalizeApiDef({ name: ' a ', method: 'GET', path: '/' })
    expect(d.name).toBe('a')
    expect(d.description).toBe('')
    expect(d.headers).toEqual([])
    expect(d.queryParams).toEqual([])
    expect(d.bodyExample).toBe('')
    expect(d.responseExample).toBe('')
  })
  it('headers 规范化：过滤空名与非对象', () => {
    const d = normalizeApiDef({
      name: 'a',
      method: 'GET',
      path: '/',
      headers: [{ name: 'X-A', required: 1, description: 'h' }, { name: '' }, 42, null],
    })
    expect(d.headers).toEqual([{ name: 'X-A', required: false, description: 'h' }])
  })
  it('queryParams 规范化：type 缺省 string', () => {
    const d = normalizeApiDef({
      name: 'a',
      method: 'GET',
      path: '/',
      queryParams: [{ name: 'q', required: true }],
    })
    expect(d.queryParams).toEqual([{ name: 'q', type: 'string', required: true, description: '' }])
  })
  it('非数组 headers/queryParams 置空', () => {
    const d = normalizeApiDef({ name: 'a', method: 'GET', path: '/', headers: 'x', queryParams: 1 })
    expect(d.headers).toEqual([])
    expect(d.queryParams).toEqual([])
  })
})

describe('parseApiDefs', () => {
  it('非法 JSON 抛错', () => {
    expect(() => parseApiDefs('{')).toThrow('不是合法 JSON')
  })
  it('空数组抛错', () => {
    expect(() => parseApiDefs('[]')).toThrow('至少定义一个接口')
  })
  it('单个对象自动包数组', () => {
    const defs = parseApiDefs('{"name":"a","method":"GET","path":"/"}')
    expect(defs).toHaveLength(1)
    expect(defs[0].name).toBe('a')
  })
  it('错误带序号前缀', () => {
    expect(() =>
      parseApiDefs(
        '[{"name":"a","method":"GET","path":"/"},{"name":"","method":"GET","path":"/"}]',
      ),
    ).toThrow('第 2 个接口：接口名称不能为空')
  })
})

describe('escapeMdCell', () => {
  it('转义竖线与换行', () => {
    expect(escapeMdCell('a|b\nc')).toBe('a\\|b<br>c')
  })
})

describe('anchorOf', () => {
  it('中文保留空格转横线', () => {
    expect(anchorOf('获取用户信息')).toBe('获取用户信息')
    expect(anchorOf('Get User Info')).toBe('get-user-info')
  })
  it('特殊符号去掉', () => {
    expect(anchorOf('a/b?c')).toBe('abc')
  })
})

describe('generateApiDoc', () => {
  it('空数组抛错', () => {
    expect(() => generateApiDoc([], { title: 't', version: '1' })).toThrow('至少定义一个接口')
  })
  it('标题版本与目录', () => {
    const md = generateApiDoc([def()], { title: '用户服务', version: 'v2' })
    expect(md).toContain('# 用户服务')
    expect(md).toContain('版本：v2')
    expect(md).toContain('## 目录')
    expect(md).toContain('[GET /api/users/{id} - 获取用户]')
  })
  it('空标题用默认', () => {
    const md = generateApiDoc([def()], { title: '  ', version: '' })
    expect(md).toContain('# API 文档')
    expect(md).not.toContain('版本：')
  })
  it('接口章节含方法路径与描述', () => {
    const md = generateApiDoc([def()], { title: 't', version: '' })
    expect(md).toContain('## 1. 获取用户')
    expect(md).toContain('GET /api/users/{id}')
    expect(md).toContain('查询用户')
  })
  it('请求头表格', () => {
    const md = generateApiDoc([def()], { title: 't', version: '' })
    expect(md).toContain('### 请求头')
    expect(md).toContain('| Authorization | 是 | Bearer 令牌 |')
  })
  it('查询参数表格', () => {
    const md = generateApiDoc([def()], { title: 't', version: '' })
    expect(md).toContain('### 查询参数')
    expect(md).toContain('| verbose | boolean | 否 | 是否详情 |')
  })
  it('请求体与响应示例代码块', () => {
    const md = generateApiDoc([def()], { title: 't', version: '' })
    expect(md).toContain('### 请求体示例')
    expect(md).toContain('### 响应示例')
    expect(md).toContain('```json')
    expect(md).toContain('{"id":1}')
  })
  it('无可选内容时不输出对应章节', () => {
    const md = generateApiDoc(
      [
        def({
          description: '',
          headers: [],
          queryParams: [],
          bodyExample: '',
          responseExample: '',
        }),
      ],
      { title: 't', version: '' },
    )
    expect(md).not.toContain('### 请求头')
    expect(md).not.toContain('### 查询参数')
    expect(md).not.toContain('### 请求体示例')
    expect(md).not.toContain('### 响应示例')
  })
  it('查询参数必填显示是', () => {
    const md = generateApiDoc(
      [def({ queryParams: [{ name: 'id', type: 'number', required: true, description: '' }] })],
      { title: 't', version: '' },
    )
    expect(md).toContain('| id | number | 是 |  |')
  })
  it('多接口序号递增', () => {
    const md = generateApiDoc(
      [def(), def({ name: '创建用户', method: 'POST', path: '/api/users' })],
      {
        title: 't',
        version: '',
      },
    )
    expect(md).toContain('## 1. 获取用户')
    expect(md).toContain('## 2. 创建用户')
  })
  it('表格单元格转义', () => {
    const md = generateApiDoc(
      [def({ headers: [{ name: 'X', required: false, description: 'a|b' }] })],
      { title: 't', version: '' },
    )
    expect(md).toContain('a\\|b')
  })
})
