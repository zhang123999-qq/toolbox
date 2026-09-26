import { describe, expect, it } from 'vitest'
import { TomlParseError, transform } from './utils'
import type { TomlInput, TomlOptions } from './schema'

const toml2json: TomlOptions = { direction: 'toml2json', indent: '2' }
const json2toml: TomlOptions = { direction: 'json2toml', indent: '2' }

describe('toml-parse / transform', () => {
  it('解析键值对与表', () => {
    const input: TomlInput = {
      text: 'title = "工具库"\nport = 8080\n\n[server]\nhost = "127.0.0.1"\nport = 9090',
    }
    expect(JSON.parse(transform(input, toml2json))).toEqual({
      title: '工具库',
      port: 8080,
      server: { host: '127.0.0.1', port: 9090 },
    })
  })

  it('解析数组表、数组与内联表', () => {
    const input: TomlInput = {
      text: [
        'nums = [1, 2, 3]',
        'inline = {a = 1, b = "x"}',
        '',
        '[[tags]]',
        'name = "yaml"',
        '',
        '[[tags]]',
        'name = "json"',
      ].join('\n'),
    }
    expect(JSON.parse(transform(input, toml2json))).toEqual({
      nums: [1, 2, 3],
      inline: { a: 1, b: 'x' },
      tags: [{ name: 'yaml' }, { name: 'json' }],
    })
  })

  it('识别整数进制、浮点与日期时间', () => {
    const input: TomlInput = {
      text: 'hex = 0x1f\nbig = 1_000\npi = 3.14\nexp = 1e3\nwhen = 2024-01-02T03:04:05Z\nday = 2024-01-02',
    }
    expect(JSON.parse(transform(input, toml2json))).toEqual({
      hex: 31,
      big: 1000,
      pi: 3.14,
      exp: 1000,
      when: '2024-01-02T03:04:05Z',
      day: '2024-01-02',
    })
  })

  it('支持字面字符串与多行字符串', () => {
    const input: TomlInput = { text: 'raw = \'C:\\path\'\ndesc = """\nline1\nline2\n"""' }
    expect(JSON.parse(transform(input, toml2json))).toEqual({
      raw: 'C:\\path',
      desc: 'line1\nline2\n',
    })
  })

  it('JSON 转 TOML 生成表与数组表', () => {
    const input: TomlInput = {
      text: '{"title":"工具库","server":{"host":"127.0.0.1"},"tags":[{"name":"a"},{"name":"b"}]}',
    }
    expect(transform(input, json2toml)).toBe(
      [
        'title = "工具库"',
        '',
        '[server]',
        'host = "127.0.0.1"',
        '',
        '[[tags]]',
        'name = "a"',
        '',
        '[[tags]]',
        'name = "b"',
      ].join('\n'),
    )
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, toml2json)).toBe('')
    expect(transform({ text: ' \n# 只有注释\n' }, toml2json)).toBe('{}')
  })

  it('缺少 = 时抛出带行列位置的 TomlParseError（异常）', () => {
    expect(() => transform({ text: 'title "工具库"' }, toml2json)).toThrow(TomlParseError)
    expect(() => transform({ text: 'title "工具库"' }, toml2json)).toThrow(/第 1 行/)
  })

  it('值缺少引号时报中文错误（异常）', () => {
    expect(() => transform({ text: 'title = 工具库' }, toml2json)).toThrow(/无法识别的值/)
  })

  it('JSON 方向收到 null 或非对象顶层时抛错（异常）', () => {
    expect(() => transform({ text: '{"a":null}' }, json2toml)).toThrow(TomlParseError)
    expect(() => transform({ text: '[1,2]' }, json2toml)).toThrow(TomlParseError)
    expect(() => transform({ text: '{oops' }, json2toml)).toThrow(TomlParseError)
  })

  it('超长输入抛错（边界）', () => {
    expect(() => transform({ text: 'a = ' + 'x'.repeat(1_000_001) }, toml2json)).toThrow(
      TomlParseError,
    )
  })
})
