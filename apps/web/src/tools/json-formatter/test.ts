import { describe, expect, it } from 'vitest'
import { JsonFormatError, minify, transform } from './utils'
import type { JsonInput, JsonOptions } from './schema'

const baseOptions: JsonOptions = { indent: '2', sortKeys: false }

describe('json-formatter / transform', () => {
  it('按指定缩进格式化', () => {
    const input: JsonInput = { text: '{"a":1}' }
    expect(transform(input, baseOptions)).toBe('{\n  "a": 1\n}')
  })

  it('支持 4 空格缩进', () => {
    const input: JsonInput = { text: '{"a":1}' }
    expect(transform(input, { ...baseOptions, indent: '4' })).toBe('{\n    "a": 1\n}')
  })

  it('sortKeys 开启时按键名排序', () => {
    const input: JsonInput = { text: '{"b":1,"a":2}' }
    expect(transform(input, { ...baseOptions, sortKeys: true })).toBe('{\n  "a": 2,\n  "b": 1\n}')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '   ' }, baseOptions)).toBe('')
  })

  it('非法 JSON 抛出 JsonFormatError（异常）', () => {
    expect(() => transform({ text: '{bad json' }, baseOptions)).toThrow(JsonFormatError)
  })

  it('顶层数组可正常格式化', () => {
    expect(transform({ text: '[1,2]' }, baseOptions)).toBe('[\n  1,\n  2\n]')
  })
})

describe('json-formatter / minify', () => {
  it('去除空白', () => {
    expect(minify({ text: '{  "a" : 1 }' })).toBe('{"a":1}')
  })

  it('空输入返回空字符串', () => {
    expect(minify({ text: '' })).toBe('')
  })
})
