import { describe, expect, it } from 'vitest'
import { JsonPathError, MAX_INPUT, transform } from './utils'
import type { JsonPathOptions } from './schema'

const baseOptions: JsonPathOptions = { pattern: '$.a', mode: 'value' }

function query(text: string, pattern: string, mode: 'value' | 'path' = 'value'): string {
  return transform({ text }, { pattern, mode })
}

const SAMPLE =
  '{"store":{"book":[{"title":"Sayings","price":8.95},{"title":"Sword","price":12.99}]}}'

describe('jsonpath / transform', () => {
  it('支持 $.a.b 逐层取值', () => {
    expect(query('{"a":{"b":1}}', '$.a.b')).toBe('[\n  1\n]')
  })

  it('支持 [0] 与 [*]', () => {
    expect(query(SAMPLE, '$.store.book[0].title')).toBe('[\n  "Sayings"\n]')
    expect(JSON.parse(query(SAMPLE, '$.store.book[*].title'))).toEqual(['Sayings', 'Sword'])
  })

  it('支持 ..name 递归查找', () => {
    expect(JSON.parse(query(SAMPLE, '$..title'))).toEqual(['Sayings', 'Sword'])
  })

  it('支持负下标与并集下标', () => {
    expect(query(SAMPLE, '$.store.book[-1].title')).toBe('[\n  "Sword"\n]')
    expect(JSON.parse(query(SAMPLE, '$.store.book[0,1].title'))).toEqual(['Sayings', 'Sword'])
  })

  it('路径模式输出完整路径与取值', () => {
    expect(query('{"a":{"b":1}}', '$.a.b', 'path')).toBe('$.a.b = 1')
    expect(query(SAMPLE, '$.store.book[1].title', 'path')).toBe('$.store.book[1].title = "Sword"')
  })

  it('命中为空时给出明示（边界）', () => {
    expect(query('{"a":1}', '$.x')).toBe('无匹配结果')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: ' \n' }, baseOptions)).toBe('')
  })

  it('表达式缺 $ 前缀、筛选项、切片都抛 JsonPathError（异常）', () => {
    expect(() => query('{"a":1}', 'a')).toThrow(JsonPathError)
    expect(() => query('{"a":1}', '$.a')).not.toThrow()
    expect(() => query('{"a":[1,2]}', '$.a[?(@>1)]')).toThrow(/不支持筛选表达式/)
    expect(() => query('{"a":[1,2]}', '$.a[0:1]')).toThrow(/不支持切片语法/)
    expect(() => query('{"a":1}', '')).toThrow(/请填写 JSONPath 表达式/)
  })

  it('非法 JSON 与超长输入抛出 JsonPathError（异常/边界）', () => {
    expect(() => query('{"a":', '$.a')).toThrow(JsonPathError)
    expect(() => transform({ text: 'x'.repeat(MAX_INPUT + 1) }, baseOptions)).toThrow(JsonPathError)
  })
})
