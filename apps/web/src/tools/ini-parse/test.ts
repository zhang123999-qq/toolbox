import { describe, expect, it } from 'vitest'
import { IniParseError, transform } from './utils'
import type { IniInput, IniOptions } from './schema'

const ini2json: IniOptions = { direction: 'ini2json', indent: '2' }
const json2ini: IniOptions = { direction: 'json2ini', indent: '2' }

describe('ini-parse / transform', () => {
  it('解析全局键、小节与嵌套小节', () => {
    const input: IniInput = {
      text: 'name = 工具库\n\n[server]\nhost = 127.0.0.1\n\n[server.tls]\nenabled = true',
    }
    expect(JSON.parse(transform(input, ini2json))).toEqual({
      name: '工具库',
      server: { host: '127.0.0.1', tls: { enabled: true } },
    })
  })

  it('识别布尔、数字与引号值', () => {
    const input: IniInput = {
      text: 'debug = true\nport = 8080\nratio = 0.5\nquoted = "a b"\nliteral = \'c d\'',
    }
    expect(JSON.parse(transform(input, ini2json))).toEqual({
      debug: true,
      port: 8080,
      ratio: 0.5,
      quoted: 'a b',
      literal: 'c d',
    })
  })

  it('忽略 ; 与 # 注释（含行尾注释）', () => {
    const input: IniInput = { text: '; 整行注释\n# 另一种注释\na = 1 ; 行尾注释\nb = 2 # 井号' }
    expect(JSON.parse(transform(input, ini2json))).toEqual({ a: 1, b: 2 })
  })

  it('支持冒号分隔与重复键后者覆盖', () => {
    const input: IniInput = { text: 'url: http://example.com\na = 1\na = 2' }
    expect(JSON.parse(transform(input, ini2json))).toEqual({
      url: 'http://example.com',
      a: 2,
    })
  })

  it('JSON 转 INI 生成小节', () => {
    const input: IniInput = {
      text: '{"name":"工具库","server":{"tls":{"enabled":true}},"tags":["a","b"]}',
    }
    expect(transform(input, json2ini)).toBe(
      [
        'name = 工具库',
        'tags = a',
        'tags = b',
        '',
        '[server]',
        '',
        '[server.tls]',
        'enabled = true',
      ].join('\n'),
    )
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, ini2json)).toBe('')
    expect(transform({ text: ' \n; 只有注释\n' }, ini2json)).toBe('{}')
  })

  it('缺少分隔符时抛出带行列位置的 IniParseError（异常）', () => {
    expect(() => transform({ text: 'just-a-key' }, ini2json)).toThrow(IniParseError)
    expect(() => transform({ text: 'ok = 1\njust-a-key' }, ini2json)).toThrow(/第 2 行/)
  })

  it('小节缺少 ] 时报错（异常）', () => {
    expect(() => transform({ text: '[server\nport = 1' }, ini2json)).toThrow(/小节名缺少/)
  })

  it('JSON 方向遇到 null 或非对象顶层时抛错（异常）', () => {
    expect(() => transform({ text: '{"a":null}' }, json2ini)).toThrow(IniParseError)
    expect(() => transform({ text: '[1,2]' }, json2ini)).toThrow(IniParseError)
    expect(() => transform({ text: '{oops' }, json2ini)).toThrow(IniParseError)
  })

  it('超长输入抛错（边界）', () => {
    expect(() => transform({ text: 'a = ' + 'x'.repeat(1_000_001) }, ini2json)).toThrow(
      IniParseError,
    )
  })
})
