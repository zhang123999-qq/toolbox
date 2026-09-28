/**
 * vercel（#814）utils 单测：vercel.json 生成、回读与校验。
 */
import { describe, expect, it } from 'vitest'
import {
  buildVercelJson,
  EXAMPLE_VERCEL_JSON,
  parseVercelJson,
  summarizeConfig,
  type VercelConfig,
} from './utils'

const VALID: VercelConfig = {
  rewrites: [{ source: '/api/:path*', destination: 'https://api.example.com/:path*' }],
  redirects: [{ source: '/old', destination: '/new', permanent: true }],
  headers: [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }],
}

describe('buildVercelJson', () => {
  it('生成格式化 JSON', () => {
    const json = buildVercelJson(VALID)
    expect(JSON.parse(json)).toEqual(VALID)
    expect(json).toContain('\n')
  })
  it('空节被省略', () => {
    const json = buildVercelJson({ rewrites: [], redirects: [], headers: [] })
    expect(json).toBe('{}')
  })
  it('source 不以 / 开头抛错', () => {
    expect(() =>
      buildVercelJson({ rewrites: [{ source: 'api', destination: '/x' }], redirects: [], headers: [] }),
    ).toThrow('rewrites[0].source 必须以 / 开头')
  })
  it('destination 非法抛错', () => {
    expect(() =>
      buildVercelJson({ rewrites: [{ source: '/a', destination: 'ftp://x' }], redirects: [], headers: [] }),
    ).toThrow('rewrites[0].destination 须以 / 开头或为合法 http(s) 地址')
  })
  it('destination 支持外链', () => {
    expect(() =>
      buildVercelJson({ redirects: [{ source: '/o', destination: 'https://a.com', permanent: false }], rewrites: [], headers: [] }),
    ).not.toThrow()
  })
  it('headers 空 key 抛错', () => {
    expect(() =>
      buildVercelJson({ rewrites: [], redirects: [], headers: [{ source: '/', headers: [{ key: ' ', value: 'v' }] }] }),
    ).toThrow('headers[0].headers[0].key 不能为空')
  })
})

describe('parseVercelJson', () => {
  it('示例 round-trip', () => {
    const config = parseVercelJson(EXAMPLE_VERCEL_JSON)
    expect(config).toEqual(VALID)
    expect(buildVercelJson(config)).toBe(EXAMPLE_VERCEL_JSON)
  })
  it('缺省节为空数组', () => {
    expect(parseVercelJson('{}')).toEqual({ rewrites: [], redirects: [], headers: [] })
  })
  it('permanent 缺省为 true', () => {
    const config = parseVercelJson('{"redirects":[{"source":"/a","destination":"/b"}]}')
    expect(config.redirects[0].permanent).toBe(true)
  })
  it('JSON 非法抛错', () => {
    expect(() => parseVercelJson('{bad')).toThrow('JSON 解析失败')
  })
  it('顶层非对象抛错', () => {
    expect(() => parseVercelJson('null')).toThrow('顶层须为对象')
    expect(() => parseVercelJson('"str"')).toThrow('顶层须为对象')
    expect(parseVercelJson('[1]')).toEqual({ rewrites: [], redirects: [], headers: [] })
  })
  it('rewrites 非数组抛错', () => {
    expect(() => parseVercelJson('{"rewrites":{}}')).toThrow('rewrites 须为数组')
  })
  it('rewrites 元素非对象抛错', () => {
    expect(() => parseVercelJson('{"rewrites":[1]}')).toThrow('rewrites[0] 须为对象')
  })
  it('rewrites 字段非字符串抛错', () => {
    expect(() => parseVercelJson('{"rewrites":[{"source":1,"destination":"/b"}]}')).toThrow(
      'rewrites[0].source 须为字符串',
    )
  })
  it('rewrites 路径非法抛错', () => {
    expect(() => parseVercelJson('{"rewrites":[{"source":"a","destination":"/b"}]}')).toThrow(
      '必须以 / 开头',
    )
  })
  it('redirects 元素非对象抛错', () => {
    expect(() => parseVercelJson('{"redirects":[null]}')).toThrow('redirects[0] 须为对象')
  })
  it('redirects permanent 非布尔抛错', () => {
    expect(() =>
      parseVercelJson('{"redirects":[{"source":"/a","destination":"/b","permanent":"yes"}]}'),
    ).toThrow('redirects[0].permanent 须为布尔值')
  })
  it('redirects destination 非法抛错', () => {
    expect(() => parseVercelJson('{"redirects":[{"source":"/a","destination":"x"}]}')).toThrow(
      '须以 / 开头或为合法 http(s) 地址',
    )
  })
  it('headers 元素非对象抛错', () => {
    expect(() => parseVercelJson('{"headers":[2]}')).toThrow('headers[0] 须为对象')
  })
  it('headers.headers 非数组抛错', () => {
    expect(() => parseVercelJson('{"headers":[{"source":"/","headers":{}}]}')).toThrow(
      'headers[0].headers 须为数组',
    )
  })
  it('headers 条目非对象抛错', () => {
    expect(() => parseVercelJson('{"headers":[{"source":"/","headers":[3]}]}')).toThrow(
      'headers[0].headers[0] 须为对象',
    )
  })
  it('headers 条目 value 非字符串抛错', () => {
    expect(() => parseVercelJson('{"headers":[{"source":"/","headers":[{"key":"k","value":1}]}]}')).toThrow(
      'headers[0].headers[0].value 须为字符串',
    )
  })
  it('headers 条目空 key 抛错', () => {
    expect(() => parseVercelJson('{"headers":[{"source":"/","headers":[{"key":"","value":"v"}]}]}')).toThrow(
      'key 不能为空',
    )
  })
})

describe('summarizeConfig', () => {
  it('输出各节条目数', () => {
    expect(summarizeConfig(VALID)).toBe('rewrites 1 条，redirects 1 条，headers 1 条')
  })
})
