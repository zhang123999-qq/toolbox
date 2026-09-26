import { describe, expect, it } from 'vitest'
import { JsonlError, MAX_INPUT, transform } from './utils'
import type { JsonlOptions } from './schema'

const baseOptions: JsonlOptions = { mode: 'jsonl2json', skipEmpty: false }

function run(text: string, overrides: Partial<JsonlOptions> = {}): string {
  return transform({ text }, { ...baseOptions, ...overrides })
}

describe('jsonl / transform', () => {
  it('把每行一个 JSON 解析成数组', () => {
    const result = run('{"a":1}\n{"a":2}')
    expect(JSON.parse(result)).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('数组置换成一行一个 JSON', () => {
    expect(run('[{"a":1},{"b":2}]', { mode: 'json2jsonl' })).toBe('{"a":1}\n{"b":2}')
  })

  it('逐行校验给出合法/不合法明细', () => {
    const result = run('{"a":1}\nbroken\n', { mode: 'validate' })
    expect(result).toContain('校验结果：合法 1 行，不合法 1 行，空行 0 行')
    expect(result).toContain('行 1：合法，顶层类型 object')
    expect(result).toContain('行 2：不合法 —— broken')
  })

  it('skipEmpty 决定是否允许空行', () => {
    expect(() => run('{"a":1}\n\n{"a":2}')).toThrow(/第 2 行是空行/)
    expect(() => run('{"a":1}\n\n{"a":2}', { skipEmpty: true })).not.toThrow()
    expect(run('{"a":1}\n\n', { mode: 'validate', skipEmpty: true })).toContain('空行 1 行')
  })

  it('坏行报出具体行号与内容（异常）', () => {
    expect(() => run('{"a":1}\n{"a":}\n')).toThrow(/第 2 行不是合法 JSON/)
  })

  it('非数组内容不能转成 JSONL（异常）', () => {
    expect(() => run('{"a":1}', { mode: 'json2jsonl' })).toThrow(/不是 JSON 数组/)
    expect(() => run('[', { mode: 'json2jsonl' })).toThrow(/不是合法 JSON/)
  })

  it('标量行、结尾换行、纯空白都能处理（边界）', () => {
    expect(run('1\n2\n')).toBe('[\n  1,\n  2\n]')
    // 结尾那一个换行是排版习惯，其余空行按 skipEmpty 处理
    expect(run('{"a":1}\n')).toBe('[\n  {\n    "a": 1\n  }\n]')
    expect(() => run('{"a":1}\n\n')).toThrow(/第 2 行是空行/)
    expect(run('{"a":1}\n\n', { skipEmpty: true })).toBe('[\n  {\n    "a": 1\n  }\n]')
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: ' \n ' }, baseOptions)).toBe('')
  })

  it('超长输入抛出 JsonlError（边界）', () => {
    expect(() => transform({ text: 'x'.repeat(MAX_INPUT + 1) }, baseOptions)).toThrow(JsonlError)
  })
})
