import { describe, expect, it } from 'vitest'
import {
  HttpHeaderParserError,
  buildHeaders,
  duplicatedNames,
  parseHeaders,
  transform,
} from './utils'
import type { HttpHeaderInput, HttpHeaderOptions } from './schema'

const baseOptions: HttpHeaderOptions = { direction: 'parse', format: 'text' }
const jsonOptions: HttpHeaderOptions = { direction: 'parse', format: 'json' }

const RAW: HttpHeaderInput = {
  text: [
    'GET /index.html HTTP/1.1',
    'Host: example.com',
    'Accept-Language: zh-CN, zh',
    'X-Trace: abc',
  ].join('\n'),
}

describe('http-header-parser / transform', () => {
  it('解析请求头：识别起始行并逐行列出字段', () => {
    const out = transform(RAW, baseOptions)
    expect(out).toContain('起始行: GET /index.html HTTP/1.1')
    expect(out).toMatch(/Host\s+: example\.com/)
    expect(out).toMatch(/Accept-Language: zh-CN, zh/)
    expect(out).toContain('共 3 个字段')
  })

  it('解析响应头时状态行同样识别，且按 CRLF 换行也能切开', () => {
    const input: HttpHeaderInput = {
      text: 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nSet-Cookie: a=1\r\nSet-Cookie: b=2\r\n',
    }
    const parsed = parseHeaders(input.text)
    expect(parsed.kind).toBe('response')
    expect(parsed.startLine).toBe('HTTP/1.1 200 OK')
    expect(parsed.headers).toHaveLength(3)
    expect(duplicatedNames(parsed.headers)).toEqual(['Set-Cookie'])
  })

  it('折行按空格接到上一个字段的值后面（边界）', () => {
    const input: HttpHeaderInput = {
      text: 'POST /x HTTP/1.1\nX-Long: first\n  second\nX-End: 1',
    }
    const parsed = parseHeaders(input.text)
    expect(parsed.headers[0]).toEqual({ name: 'X-Long', value: 'first second' })
    expect(parsed.headers[1]).toEqual({ name: 'X-End', value: '1' })
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '   \n  ' }, baseOptions)).toBe('')
  })

  it('既无起始行也无字段时抛 HttpHeaderParserError（异常）', () => {
    expect(() => transform({ text: '随便一段正文' }, baseOptions)).toThrow(HttpHeaderParserError)
  })

  it('头区域内缺少冒号的行报错并指出行号（异常）', () => {
    const input: HttpHeaderInput = { text: 'GET / HTTP/1.1\n这不是头' }
    expect(() => transform(input, baseOptions)).toThrow(HttpHeaderParserError)
    expect(() => transform(input, baseOptions)).toThrow(/第 2 行/)
  })

  it('JSON 输出可直接 JSON.parse 回原文结果', () => {
    const parsed = JSON.parse(transform(RAW, jsonOptions)) as {
      kind: string
      count: number
      headers: { name: string; value: string }[]
    }
    expect(parsed.kind).toBe('request')
    expect(parsed.count).toBe(3)
    expect(parsed.headers[0]).toEqual({ name: 'Host', value: 'example.com' })
  })

  it('build 方向：对象 JSON 拼成「名称: 值」文本', () => {
    const input: HttpHeaderInput = { text: '{"Content-Type":"text/plain","X-A":[1,2]}' }
    expect(transform(input, { direction: 'build', format: 'json' })).toBe(
      'Content-Type: text/plain\nX-A: 1\nX-A: 2',
    )
  })

  it('build 方向：解析输出的 JSON 可以回环重建', () => {
    const once = JSON.parse(transform(RAW, jsonOptions)) as Record<string, unknown>
    expect(transform({ text: JSON.stringify(once) }, { direction: 'build', format: 'json' })).toBe(
      'GET /index.html HTTP/1.1\nHost: example.com\nAccept-Language: zh-CN, zh\nX-Trace: abc',
    )
  })

  it('build 方向：非法 JSON 抛 HttpHeaderParserError（异常）', () => {
    expect(() => buildHeaders('{oops', 'json')).toThrow(HttpHeaderParserError)
  })

  it('build 方向：文本模式识别起始行并跳过 # 注释', () => {
    const input: HttpHeaderInput = { text: '# 备注\nHTTP/1.1 204 No Content\nX-A: 1' }
    expect(transform(input, { direction: 'build', format: 'text' })).toBe(
      'HTTP/1.1 204 No Content\nX-A: 1',
    )
  })

  it('超长输入抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: 'x'.repeat(200_001) }, baseOptions)).toThrow(
      HttpHeaderParserError,
    )
  })
})
