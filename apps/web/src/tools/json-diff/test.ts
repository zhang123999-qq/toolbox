import { describe, expect, it } from 'vitest'
import { JsonDiffError, MAX_INPUT, transform } from './utils'
import type { JsonDiffInput, JsonDiffOptions } from './schema'

const baseOptions: JsonDiffOptions = { mode: 'line', sortKeys: false }

function pair(text: string, textB: string): JsonDiffInput {
  return { text, textB }
}

describe('json-diff / transform', () => {
  it('行级 diff 标出被改动的那一行', () => {
    const result = transform(pair('{\n  "a": 1\n}', '{\n  "a": 2\n}'), baseOptions)
    expect(result).toContain('-   "a": 1')
    expect(result).toContain('+   "a": 2')
  })

  it('两侧内容相同时给出明示', () => {
    expect(transform(pair('{"a":1}', '{ "a" : 1 }'), baseOptions)).toBe('两份 JSON 内容相同')
  })

  it('sortKeys 开启后键顺序差异不算改动', () => {
    const options: JsonDiffOptions = { mode: 'line', sortKeys: true }
    expect(transform(pair('{"a":1,"b":2}', '{"b":2,"a":1}'), options)).toBe('两份 JSON 内容相同')
    expect(transform(pair('{"a":1,"b":2}', '{"b":2,"a":1}'), baseOptions)).not.toBe(
      '两份 JSON 内容相同',
    )
  })

  it('字符级 diff 也能产出差异片段', () => {
    const options: JsonDiffOptions = { mode: 'char', sortKeys: false }
    expect(transform(pair('{"a":1}', '{"a":2}'), options)).toContain('+')
  })

  it('两侧都空时返回空串（边界）', () => {
    expect(transform(pair('', ''), baseOptions)).toBe('')
    expect(transform(pair('  \n', '\n '), baseOptions)).toBe('')
  })

  it('只有一侧有内容或非法的 JSON 都抛 JsonDiffError（异常）', () => {
    expect(() => transform(pair('{"a":1}', ''), baseOptions)).toThrow(JsonDiffError)
    expect(() => transform(pair('', '{"a":1}'), baseOptions)).toThrow(JsonDiffError)
    expect(() => transform(pair('{"a":1}', '{"a":'), baseOptions)).toThrow(/右侧不是合法的 JSON/)
    expect(() => transform(pair('{"a":', '{"a":1}'), baseOptions)).toThrow(/左侧不是合法的 JSON/)
  })

  it('超长输入抛出 JsonDiffError（边界）', () => {
    expect(() => transform(pair('x'.repeat(MAX_INPUT + 1), '{}'), baseOptions)).toThrow(
      JsonDiffError,
    )
  })
})
