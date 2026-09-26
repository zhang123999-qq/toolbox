import { describe, expect, it } from 'vitest'
import { JsonToYamlError, needsQuoting, transform } from './utils'
import type { JsonToYamlOptions } from './schema'

const baseOptions: JsonToYamlOptions = { indent: '2', quote: 'needed' }

describe('json-to-yaml / transform', () => {
  it('标量字段以 key: value 输出', () => {
    expect(transform({ text: '{"a":1,"b":"x","c":true,"d":null}' }, baseOptions)).toBe(
      'a: 1\nb: x\nc: true\nd: null',
    )
  })

  it('嵌套对象缩进', () => {
    expect(transform({ text: '{"m":{"x":1}}' }, baseOptions)).toBe('m:\n  x: 1')
  })

  it('标量数组用块序列', () => {
    expect(transform({ text: '{"t":["a","b"]}' }, baseOptions)).toBe('t:\n  - a\n  - b')
  })

  it('对象数组首键与 "- " 同行、其余键对齐', () => {
    expect(transform({ text: '[{"a":1,"b":2}]' }, baseOptions)).toBe('- a: 1\n  b: 2')
  })

  it('顶层标量数组', () => {
    expect(transform({ text: '["a","b"]' }, baseOptions)).toBe('- a\n- b')
  })

  it('空对象 / 空数组用流式花括号', () => {
    expect(transform({ text: '{"a":{},"b":[]}' }, baseOptions)).toBe('a: {}\nb: []')
  })

  it('有歧义的字符串加双引号', () => {
    expect(transform({ text: '{"a":"true","b":"123","c":"yes","d":"x: y"}' }, baseOptions)).toBe(
      'a: "true"\nb: "123"\nc: "yes"\nd: "x: y"',
    )
  })

  it('quote=all 时所有字符串都加引号', () => {
    expect(transform({ text: '{"a":"x"}' }, { ...baseOptions, quote: 'all' })).toBe('a: "x"')
  })

  it('含特殊字符的键加引号', () => {
    expect(transform({ text: '{"a:b":1}' }, baseOptions)).toBe('"a:b": 1')
  })

  it('4 空格缩进', () => {
    expect(transform({ text: '{"m":{"x":1}}' }, { ...baseOptions, indent: '4' })).toBe(
      'm:\n    x: 1',
    )
  })

  it('根标量直接输出', () => {
    expect(transform({ text: '"hi"' }, baseOptions)).toBe('hi')
    expect(transform({ text: '123' }, baseOptions)).toBe('123')
  })

  it('needsQuoting 边界判定', () => {
    expect(needsQuoting('')).toBe(true)
    expect(needsQuoting('null')).toBe(true)
    expect(needsQuoting('plain_text')).toBe(false)
    expect(needsQuoting(' leading')).toBe(true)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
  })

  it('非法 JSON / 超长抛错（异常）', () => {
    expect(() => transform({ text: '{x' }, baseOptions)).toThrow(JsonToYamlError)
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToYamlError,
    )
  })
})
