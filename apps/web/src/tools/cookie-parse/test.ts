import { describe, expect, it } from 'vitest'
import { CookieError, build, parse, transform } from './utils'
import type { CookieOptions } from './schema'

const parseOptions: CookieOptions = { mode: 'parse', sortKeys: false }
const buildOptions: CookieOptions = { mode: 'build', sortKeys: false }

describe('cookie-parse / parse', () => {
  it('解析普通 Cookie 串', () => {
    expect(parse('a=1; b=two', false)).toEqual({ a: '1', b: 'two' })
  })

  it('无值属性记为 true', () => {
    expect(parse('sid=x; HttpOnly; Secure', false)).toEqual({
      sid: 'x',
      HttpOnly: true,
      Secure: true,
    })
  })

  it('Set-Cookie 形式可解析出 Path / Max-Age', () => {
    expect(parse('sid=x; Path=/; Max-Age=3600', false)).toEqual({
      sid: 'x',
      Path: '/',
      'Max-Age': '3600',
    })
  })

  it('sortKeys 开启时按键名排序', () => {
    expect(Object.keys(parse('b=2; a=1', true))).toEqual(['a', 'b'])
  })

  it('空串与多余分号不产生空键（边界）', () => {
    expect(parse('', false)).toEqual({})
    expect(parse('a=1;;;', false)).toEqual({ a: '1' })
  })

  it('值中的等号保留', () => {
    expect(parse('token=a=b', false)).toEqual({ token: 'a=b' })
  })
})

describe('cookie-parse / build', () => {
  it('对象转 Cookie 串', () => {
    expect(build('{"a":1,"b":"two"}', false)).toBe('a=1; b=two')
  })

  it('值为 true 时只输出键名', () => {
    expect(build('{"sid":"x","HttpOnly":true}', false)).toBe('sid=x; HttpOnly')
  })

  it('sortKeys 开启时按键名排序', () => {
    expect(build('{"b":2,"a":1}', true)).toBe('a=1; b=2')
  })

  it('非法 JSON 或非对象输入抛出 CookieError（异常）', () => {
    expect(() => build('{bad', false)).toThrow(CookieError)
    expect(() => build('"str"', false)).toThrow(CookieError)
  })
})

describe('cookie-parse / transform', () => {
  it('parse 模式输出缩进 2 的 JSON', () => {
    expect(transform({ text: 'a=1' }, parseOptions)).toBe('{\n  "a": "1"\n}')
  })

  it('build 模式输出 Cookie 串', () => {
    expect(transform({ text: '{"a":1}' }, buildOptions)).toBe('a=1')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '  ' }, parseOptions)).toBe('')
  })
})
