import { describe, expect, it } from 'vitest'
import { JsonMergeError, MAX_INPUT, transform } from './utils'
import type { JsonMergeInput, JsonMergeOptions } from './schema'

const baseOptions: JsonMergeOptions = { mode: 'deep', prefer: 'override' }

function pair(text: string, textB: string): JsonMergeInput {
  return { text, textB }
}

describe('json-merge / transform', () => {
  it('深层合并递归合并同名对象', () => {
    const result = transform(pair('{"a":{"b":1,"c":2}}', '{"a":{"c":3,"d":4}}'), baseOptions)
    expect(JSON.parse(result)).toEqual({ a: { b: 1, c: 3, d: 4 } })
  })

  it('只有一边有的键直接并入', () => {
    const result = transform(pair('{"a":1}', '{"b":2}'), baseOptions)
    expect(JSON.parse(result)).toEqual({ a: 1, b: 2 })
  })

  it('prefer 为 base 时冲突保留基础侧的值', () => {
    const options: JsonMergeOptions = { mode: 'deep', prefer: 'base' }
    expect(JSON.parse(transform(pair('{"x":1}', '{"x":2}'), options))).toEqual({ x: 1 })
    expect(JSON.parse(transform(pair('{"x":1}', '{"x":2}'), baseOptions))).toEqual({ x: 2 })
  })

  it('浅层模式下同名子树整体替换而非递归合并', () => {
    const options: JsonMergeOptions = { mode: 'shallow', prefer: 'override' }
    const result = transform(pair('{"a":{"b":1,"c":2}}', '{"a":{"c":3}}'), options)
    expect(JSON.parse(result)).toEqual({ a: { c: 3 } })
  })

  it('数组不拼接，冲突时按 prefer 整体替换', () => {
    expect(JSON.parse(transform(pair('{"l":[1,2]}', '{"l":[3]}'), baseOptions))).toEqual({
      l: [3],
    })
  })

  it('两侧都空时返回空串（边界）', () => {
    expect(transform(pair('', ''), baseOptions)).toBe('')
    expect(transform(pair('\n ', ''), baseOptions)).toBe('')
  })

  it('单侧为空或非法 JSON 抛 JsonMergeError（异常）', () => {
    expect(() => transform(pair('', '{"a":1}'), baseOptions)).toThrow(JsonMergeError)
    expect(() => transform(pair('{"a":1}', ''), baseOptions)).toThrow(JsonMergeError)
    expect(() => transform(pair('{"a":1}', '{'), baseOptions)).toThrow(/附加 JSON 不合法/)
    expect(() => transform(pair('{', '{"a":1}'), baseOptions)).toThrow(/基础 JSON 不合法/)
  })

  it('超长输入抛出 JsonMergeError（边界）', () => {
    expect(() => transform(pair('x'.repeat(MAX_INPUT + 1), '{}'), baseOptions)).toThrow(
      JsonMergeError,
    )
  })
})
