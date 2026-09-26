import { describe, expect, it } from 'vitest'
import { compilePattern, matchPath, transform } from './utils'
import type { RouteDebugOptions } from './schema'

describe('route-debug / compilePattern', () => {
  it('普通命名参数编译为命名捕获组', () => {
    const { regex, names } = compilePattern('/users/:id/posts/:postId')
    expect(names).toEqual(['id', 'postId'])
    expect(regex.source).toContain('(?<id>[^/]+)')
  })

  it('通配 * 编译为 splat 命名捕获', () => {
    const { regex } = compilePattern('/files/*')
    expect(regex.source).toContain('(?<splat>.+)')
  })

  it('正则约束 :name(\\d+) 编译为内层约束', () => {
    const { regex } = compilePattern('/users/:id(\\d+)')
    expect(regex.source).toContain('(?<id>\\d+)')
  })

  it('空规则抛错', () => {
    expect(() => compilePattern('')).toThrow(/路由规则不能为空/)
  })
})

describe('route-debug / matchPath', () => {
  it('提取命名参数', () => {
    expect(matchPath('/users/:id/posts/:postId', '/users/123/posts/456')).toEqual({
      id: '123',
      postId: '456',
    })
  })

  it('不匹配时返回 null', () => {
    expect(matchPath('/users/:id', '/posts/1')).toBeNull()
  })

  it('正则约束只匹配数字', () => {
    expect(matchPath('/users/:id(\\d+)', '/users/123')).toEqual({ id: '123' })
    expect(matchPath('/users/:id(\\d+)', '/users/abc')).toBeNull()
  })

  it('可选参数 :id? 两种路径都匹配', () => {
    expect(matchPath('/users/:id?', '/users')).toEqual({})
    expect(matchPath('/users/:id?', '/users/123')).toEqual({ id: '123' })
  })

  it('通配 * 捕获剩余整段', () => {
    expect(matchPath('/files/*', '/files/a/b/c')).toEqual({ splat: 'a/b/c' })
  })
})

describe('route-debug / transform', () => {
  const opts: RouteDebugOptions = { pattern: '/users/:id/posts/:postId' }

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts)).toBe('')
  })

  it('匹配成功输出参数', () => {
    const out = transform({ text: '/users/123/posts/456' }, opts)
    expect(out).toContain('匹配成功')
    expect(out).toContain('id: 123')
    expect(out).toContain('postId: 456')
  })

  it('不匹配输出提示', () => {
    expect(transform({ text: '/posts/1' }, opts)).toContain('不匹配')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, opts)).toThrow(/上限/)
  })
})
