/**
 * edge-route（#812）utils 单测：规则解析、校验与匹配优先级。
 */
import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_ROUTES,
  matchRoute,
  parseRoutesText,
  validatePattern,
} from './utils'

describe('validatePattern', () => {
  it('合法规则不抛错', () => {
    expect(() => validatePattern('example.com/api')).not.toThrow()
    expect(() => validatePattern('example.com/static/*')).not.toThrow()
    expect(() => validatePattern('*.example.com/*')).not.toThrow()
  })
  it('空规则抛错', () => {
    expect(() => validatePattern('  ')).toThrow('路由规则不能为空')
  })
  it('含空白字符抛错', () => {
    expect(() => validatePattern('example.com/a b')).toThrow('不能包含空白字符')
  })
  it('仅为 * 抛错', () => {
    expect(() => validatePattern('*')).toThrow('不能仅为 *')
  })
})

describe('parseRoutesText', () => {
  it('解析示例文本', () => {
    const rules = parseRoutesText(EXAMPLE_ROUTES)
    expect(rules).toHaveLength(4)
    expect(rules[0]).toEqual({ pattern: 'example.com/api/users', target: 'users-api' })
  })
  it('跳过空行与注释', () => {
    expect(parseRoutesText('\n# 注释\nexample.com/a => t\n')).toHaveLength(1)
  })
  it('缺少 => 抛错带行号', () => {
    expect(() => parseRoutesText('example.com/a => t\nbadline')).toThrow('第 2 行格式非法')
  })
  it('非法规则抛错带行号', () => {
    expect(() => parseRoutesText('example.com/ok => t\n* => bad')).toThrow('第 2 行')
  })
  it('target 为空抛错', () => {
    expect(() => parseRoutesText('example.com/a => ')).toThrow('target 不能为空')
  })
})

describe('matchRoute', () => {
  const rules = parseRoutesText(EXAMPLE_ROUTES)

  it('精确匹配命中', () => {
    expect(matchRoute(rules, 'https://example.com/api/users')?.target).toBe('users-api')
  })
  it('前缀匹配命中', () => {
    expect(matchRoute(rules, 'https://example.com/static/app.js')?.target).toBe('static-assets')
  })
  it('通配符匹配命中', () => {
    expect(matchRoute(rules, 'https://blog.example.com/post/1')?.target).toBe('wildcard-catchall')
  })
  it('精确优先于前缀', () => {
    const rs = parseRoutesText('example.com/static/* => p\nexample.com/static/app.js => e')
    expect(matchRoute(rs, 'https://example.com/static/app.js')?.target).toBe('e')
  })
  it('前缀优先于通配符', () => {
    const rs = parseRoutesText('*.example.com/* => w\nexample.com/* => p')
    expect(matchRoute(rs, 'https://example.com/x')?.target).toBe('p')
  })
  it('同级更长规则优先', () => {
    const rs = parseRoutesText('example.com/a/* => short\nexample.com/a/b/* => long')
    expect(matchRoute(rs, 'https://example.com/a/b/c')?.target).toBe('long')
  })
  it('完全相同时靠前的优先', () => {
    const rs = parseRoutesText('example.com/x/* => first\nexample.com/x/* => second')
    expect(matchRoute(rs, 'https://example.com/x/y')?.target).toBe('first')
  })
  it('无命中返回 null', () => {
    expect(matchRoute(rules, 'https://other.org/')).toBeNull()
  })
  it('URL 非法中文抛错', () => {
    expect(() => matchRoute(rules, 'not a url')).toThrow('URL 格式非法')
  })
  it('URL 前后空白被容忍', () => {
    expect(matchRoute(rules, '  https://example.com/api/users  ')?.target).toBe('users-api')
  })
  it('空规则列表返回 null', () => {
    expect(matchRoute([], 'https://example.com/')).toBeNull()
  })
})
