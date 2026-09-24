import { describe, expect, it } from 'vitest'
import { QueryStringError, build, parse, transform } from './utils'
import type { QueryOptions } from './schema'

const parseOptions: QueryOptions = { mode: 'parse', sortKeys: false }
const buildOptions: QueryOptions = { mode: 'build', sortKeys: false }

describe('query-string / parse', () => {
  it('解析普通查询串', () => {
    expect(parse('a=1&b=two', false)).toEqual({ a: '1', b: 'two' })
  })

  it('重复键合并为数组', () => {
    expect(parse('tag=a&tag=b', false)).toEqual({ tag: ['a', 'b'] })
  })

  it('允许带 ? 前缀', () => {
    expect(parse('?a=1', false)).toEqual({ a: '1' })
  })

  it('完整 URL 只取查询部分', () => {
    expect(parse('https://a.test/p?x=1&y=2#top', false)).toEqual({ x: '1', y: '2' })
  })

  it('sortKeys 开启时按键名排序', () => {
    expect(Object.keys(parse('b=2&a=1', true))).toEqual(['a', 'b'])
  })

  it('空输入与空值处理（边界）', () => {
    expect(parse('', false)).toEqual({})
    expect(parse('a=', false)).toEqual({ a: '' })
  })
})

describe('query-string / build', () => {
  it('对象转查询串', () => {
    expect(build('{"a":1,"b":"two"}', false)).toBe('a=1&b=two')
  })

  it('数组展开为重复键', () => {
    expect(build('{"tag":["a","b"]}', false)).toBe('tag=a&tag=b')
  })

  it('sortKeys 开启时按键名排序', () => {
    expect(build('{"b":2,"a":1}', true)).toBe('a=1&b=2')
  })

  it('非法 JSON 或非对象输入抛出 QueryStringError（异常）', () => {
    expect(() => build('{bad', false)).toThrow(QueryStringError)
    expect(() => build('[1,2]', false)).toThrow(QueryStringError)
  })
})

describe('query-string / transform', () => {
  it('parse 模式输出缩进 2 的 JSON', () => {
    expect(transform({ text: 'a=1' }, parseOptions)).toBe('{\n  "a": "1"\n}')
  })

  it('build 模式输出查询串', () => {
    expect(transform({ text: '{"a":1}' }, buildOptions)).toBe('a=1')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '  ' }, parseOptions)).toBe('')
  })
})
