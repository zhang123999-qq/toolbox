import { describe, expect, it } from 'vitest'
import { PropertiesParseError, transform } from './utils'
import type { PropertiesInput, PropertiesOptions } from './schema'

const props2json: PropertiesOptions = {
  direction: 'props2json',
  encoding: 'unicode',
  indent: '2',
}
const json2props: PropertiesOptions = { ...props2json, direction: 'json2props' }

describe('properties-parse / transform', () => {
  it('解析键值对，值全部为字符串', () => {
    const input: PropertiesInput = { text: 'app.name = 工具库\napp.port = 8080\ndebug = false' }
    expect(JSON.parse(transform(input, props2json))).toEqual({
      'app.name': '工具库',
      'app.port': '8080',
      debug: 'false',
    })
  })

  it('还原 \\uXXXX 与其它转义', () => {
    const input: PropertiesInput = {
      text: 'legacy.title = \\u5de5\\u5177\\u5e93\nmsg = a\\nb\\tc\nescaped = a\\=b',
    }
    expect(JSON.parse(transform(input, props2json))).toEqual({
      'legacy.title': '工具库',
      msg: 'a\nb\tc',
      escaped: 'a=b',
    })
  })

  it('支持 : 与空白分隔，并忽略 # ! 注释', () => {
    const input: PropertiesInput = { text: '# 井号注释\n! 叹号注释\na: 1\nb 2\nc = 3' }
    expect(JSON.parse(transform(input, props2json))).toEqual({ a: '1', b: '2', c: '3' })
  })

  it('支持反斜杠续行', () => {
    const input: PropertiesInput = { text: 'long = a\\\n  b\\\n  c' }
    expect(JSON.parse(transform(input, props2json))).toEqual({ long: 'abc' })
  })

  it('JSON 转 Properties 输出 key=value', () => {
    const input: PropertiesInput = { text: '{"a":"1","b":"hello world"}' }
    expect(transform(input, json2props)).toBe('a=1\nb=hello world')
  })

  it('encoding=escaped 时非 ASCII 写成 \\uXXXX', () => {
    const input: PropertiesInput = { text: '{"title":"工具库"}' }
    expect(transform(input, { ...json2props, encoding: 'escaped' })).toBe(
      'title=\\u5de5\\u5177\\u5e93',
    )
  })

  it('转义键中的 = : 与反斜杠', () => {
    const input: PropertiesInput = { text: '{"a=b":1,"c:d":2,"e\\\\f":3}' }
    expect(transform(input, json2props)).toBe('a\\=b=1\nc\\:d=2\ne\\\\f=3')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, props2json)).toBe('')
    expect(transform({ text: '\n# 只有注释\n' }, props2json)).toBe('{}')
  })

  it('\\u 转义位数不足时抛出带行列位置的错误（异常）', () => {
    expect(() => transform({ text: 'a = \\u12' }, props2json)).toThrow(PropertiesParseError)
    expect(() => transform({ text: 'ok = 1\na = \\u12' }, props2json)).toThrow(/第 2 行/)
  })

  it('JSON 方向遇到 null、数组或非对象顶层时抛错（异常）', () => {
    expect(() => transform({ text: '{"a":null}' }, json2props)).toThrow(PropertiesParseError)
    expect(() => transform({ text: '{"a":[1]}' }, json2props)).toThrow(PropertiesParseError)
    expect(() => transform({ text: '[1,2]' }, json2props)).toThrow(PropertiesParseError)
    expect(() => transform({ text: '{oops' }, json2props)).toThrow(PropertiesParseError)
  })

  it('超长输入抛错（边界）', () => {
    expect(() => transform({ text: 'a = ' + 'x'.repeat(1_000_001) }, props2json)).toThrow(
      PropertiesParseError,
    )
  })
})
