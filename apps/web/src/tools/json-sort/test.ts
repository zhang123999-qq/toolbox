import { describe, expect, it } from 'vitest'
import { JsonSortError, MAX_INPUT, transform } from './utils'
import type { JsonSortInput, JsonSortOptions } from './schema'

const baseOptions: JsonSortOptions = { descending: false, format: 'compact' }
const prettyOptions: JsonSortOptions = { descending: false, format: 'pretty' }

function text(value: string): JsonSortInput {
  return { text: value }
}

describe('json-sort / transform', () => {
  it('按键名升序递归排序', () => {
    expect(transform(text('{"b":1,"a":{"d":1,"c":2}}'), baseOptions)).toBe(
      '{"a":{"c":2,"d":1},"b":1}',
    )
  })

  it('descending 开启时降序排列', () => {
    const options: JsonSortOptions = { descending: true, format: 'compact' }
    expect(transform(text('{"a":1,"c":2,"b":3}'), options)).toBe('{"c":2,"b":3,"a":1}')
  })

  it('数组元素顺序保持不变，但元素内部的键仍会排序', () => {
    expect(transform(text('{"l":[{"b":1,"a":2},{"c":3}]}'), baseOptions)).toBe(
      '{"l":[{"a":2,"b":1},{"c":3}]}',
    )
  })

  it('format 为 pretty 时缩进两格输出', () => {
    expect(transform(text('{"b":1,"a":2}'), prettyOptions)).toBe('{\n  "a": 2,\n  "b": 1\n}')
  })

  it('顶层为数组或标量时也能处理（边界）', () => {
    expect(transform(text('[{"b":1,"a":2}]'), baseOptions)).toBe('[{"a":2,"b":1}]')
    expect(transform(text('3'), baseOptions)).toBe('3')
    expect(transform(text(''), baseOptions)).toBe('')
    expect(transform(text('\n\t '), baseOptions)).toBe('')
  })

  it('非法 JSON 抛出 JsonSortError（异常）', () => {
    expect(() => transform(text('{"a":}'), baseOptions)).toThrow(JsonSortError)
  })

  it('超长输入抛出 JsonSortError（边界）', () => {
    expect(() => transform(text('x'.repeat(MAX_INPUT + 1)), baseOptions)).toThrow(JsonSortError)
  })
})
