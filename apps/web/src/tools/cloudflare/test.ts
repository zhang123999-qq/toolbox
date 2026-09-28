/**
 * cloudflare（#813）utils 单测：DNS 记录 / 页面规则校验与生成。
 */
import { describe, expect, it } from 'vitest'
import {
  buildDnsRecord,
  buildPageRule,
  dnsInputFromKv,
  pageRuleInputFromKv,
  parseKvLines,
} from './utils'

describe('buildDnsRecord', () => {
  it('合法 A 记录', () => {
    expect(
      buildDnsRecord({ type: 'A', name: 'www', content: '203.0.113.10', proxied: true, ttl: 300 }),
    ).toEqual({ type: 'A', name: 'www', content: '203.0.113.10', proxied: true, ttl: 300 })
  })
  it('TTL=1 表示自动', () => {
    expect(
      buildDnsRecord({ type: 'TXT', name: '@', content: 'v=spf1', proxied: false, ttl: 1 }).ttl,
    ).toBe(1)
  })
  it('不支持的类型抛错', () => {
    expect(() =>
      buildDnsRecord({ type: 'MX', name: '@', content: 'mail', proxied: false, ttl: 300 }),
    ).toThrow('不支持的记录类型：MX')
  })
  it('记录名/值为空抛错', () => {
    expect(() =>
      buildDnsRecord({ type: 'A', name: ' ', content: '1.2.3.4', proxied: false, ttl: 300 }),
    ).toThrow('记录名不能为空')
    expect(() =>
      buildDnsRecord({ type: 'A', name: 'www', content: ' ', proxied: false, ttl: 300 }),
    ).toThrow('记录值不能为空')
  })
  it('A 记录非 IPv4 抛错', () => {
    expect(() =>
      buildDnsRecord({ type: 'A', name: 'www', content: '999.1.1.1', proxied: false, ttl: 300 }),
    ).toThrow('须为 IPv4 地址')
    expect(() =>
      buildDnsRecord({ type: 'A', name: 'www', content: 'not-ip', proxied: false, ttl: 300 }),
    ).toThrow('须为 IPv4 地址')
  })
  it('AAAA 记录非 IPv6 抛错', () => {
    expect(() =>
      buildDnsRecord({ type: 'AAAA', name: 'www', content: '1.2.3.4', proxied: false, ttl: 300 }),
    ).toThrow('须为 IPv6 地址')
  })
  it('非法 TTL 抛错', () => {
    for (const ttl of [0, 29, 1.5, Number.NaN]) {
      expect(() =>
        buildDnsRecord({ type: 'A', name: 'www', content: '1.2.3.4', proxied: false, ttl }),
      ).toThrow('TTL 须为 1（自动）或 ≥30 的整数秒')
    }
  })
  it('前后空白被裁剪', () => {
    const r = buildDnsRecord({ type: 'A', name: ' www ', content: ' 1.2.3.4 ', proxied: false, ttl: 30 })
    expect(r.name).toBe('www')
    expect(r.content).toBe('1.2.3.4')
  })
})

describe('buildPageRule', () => {
  it('生成页面规则 JSON', () => {
    const json = buildPageRule({ pattern: 'example.com/*', cacheLevel: 'aggressive', browserTtl: 3600 })
    const obj = JSON.parse(json) as { actions: { id: string; value: unknown }[] }
    expect(obj.actions[0]).toEqual({ id: 'cache_level', value: 'aggressive' })
    expect(obj.actions[1]).toEqual({ id: 'browser_cache_ttl', value: 3600 })
  })
  it('模式为空抛错', () => {
    expect(() => buildPageRule({ pattern: ' ', cacheLevel: 'basic', browserTtl: 0 })).toThrow(
      '匹配模式不能为空',
    )
  })
  it('非法缓存级别抛错', () => {
    expect(() => buildPageRule({ pattern: 'a/*', cacheLevel: 'turbo', browserTtl: 0 })).toThrow(
      '不支持的缓存级别：turbo',
    )
  })
  it('非法浏览器 TTL 抛错', () => {
    expect(() => buildPageRule({ pattern: 'a/*', cacheLevel: 'basic', browserTtl: -1 })).toThrow(
      '浏览器缓存 TTL 须为 ≥0 的整数秒',
    )
    expect(() => buildPageRule({ pattern: 'a/*', cacheLevel: 'basic', browserTtl: 1.5 })).toThrow(
      '浏览器缓存 TTL 须为 ≥0 的整数秒',
    )
  })
})

describe('parseKvLines', () => {
  it('解析 key=value 并跳过注释', () => {
    expect(parseKvLines('a=1\n# c\nb=2')).toEqual({ a: '1', b: '2' })
  })
  it('同名后者覆盖', () => {
    expect(parseKvLines('a=1\na=2')).toEqual({ a: '2' })
  })
  it('无等号行抛错带行号', () => {
    expect(() => parseKvLines('a=1\nbad')).toThrow('第 2 行参数格式非法')
  })
})

describe('dnsInputFromKv', () => {
  it('大小写与默认值', () => {
    const input = dnsInputFromKv(parseKvLines('type=a\nname=www\ncontent=1.2.3.4'))
    expect(input).toEqual({ type: 'A', name: 'www', content: '1.2.3.4', proxied: false, ttl: 1 })
  })
  it('proxied=true 解析', () => {
    expect(dnsInputFromKv(parseKvLines('proxied=true')).proxied).toBe(true)
  })
  it('proxied=false 显式解析', () => {
    expect(dnsInputFromKv(parseKvLines('proxied=false')).proxied).toBe(false)
  })
  it('proxied 留空视为 false', () => {
    expect(dnsInputFromKv(parseKvLines('proxied=')).proxied).toBe(false)
  })
  it('proxied 非法值抛错', () => {
    expect(() => dnsInputFromKv(parseKvLines('proxied=yes'))).toThrow('proxied 须为 true 或 false')
  })
  it('ttl 非整数抛错', () => {
    expect(() => dnsInputFromKv(parseKvLines('ttl=abc'))).toThrow('ttl 须为整数')
  })
})

describe('pageRuleInputFromKv', () => {
  it('默认值', () => {
    expect(pageRuleInputFromKv(parseKvLines('pattern=a/*'))).toEqual({
      pattern: 'a/*',
      cacheLevel: 'basic',
      browserTtl: 0,
    })
  })
  it('browserTtl 非整数抛错', () => {
    expect(() => pageRuleInputFromKv(parseKvLines('browserTtl=x'))).toThrow('browserTtl 须为整数')
  })
})
