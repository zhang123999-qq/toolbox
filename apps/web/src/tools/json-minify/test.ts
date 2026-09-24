import { describe, expect, it } from 'vitest'
import { JsonMinifyError, transform } from './utils'
import type { MinifyInput, MinifyOptions } from './schema'

const baseOptions: MinifyOptions = { sortKeys: false }

describe('json-minify / transform', () => {
  it('去除空白与换行', () => {
    const input: MinifyInput = { text: '{  "a" : 1 ,\n "b": [1, 2] }' }
    expect(transform(input, baseOptions)).toBe('{"a":1,"b":[1,2]}')
  })

  it('sortKeys 开启时按键名排序后压缩', () => {
    const input: MinifyInput = { text: '{"b":1,"a":2}' }
    expect(transform(input, { sortKeys: true })).toBe('{"a":2,"b":1}')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: ' \n\t ' }, baseOptions)).toBe('')
  })

  it('非法 JSON 抛出 JsonMinifyError（异常）', () => {
    expect(() => transform({ text: '{bad json' }, baseOptions)).toThrow(JsonMinifyError)
  })

  it('保留数字精度与布尔值原样', () => {
    expect(transform({ text: '{ "n": 1.50, "t": true }' }, baseOptions)).toBe('{"n":1.5,"t":true}')
  })
})
