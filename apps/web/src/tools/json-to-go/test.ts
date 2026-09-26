import { describe, expect, it } from 'vitest'
import { JsonToGoError, transform } from './utils'
import type { JsonToGoInput, JsonToGoOptions } from './schema'

const baseOptions: JsonToGoOptions = { mode: 'nested', style: 'omitempty', indent: '2' }

describe('json-to-go / transform', () => {
  it('标量对象生成结构体并对齐列', () => {
    const input: JsonToGoInput = { text: '{"a":1}' }
    expect(transform(input, baseOptions)).toBe(
      'type Root struct {\n  A int `json:"a,omitempty"`\n}\n',
    )
  })

  it('浮点映射 float64，整数映射 int', () => {
    const input: JsonToGoInput = { text: '{"a":1.5}' }
    expect(transform(input, baseOptions)).toContain('A float64')
    expect(transform({ text: '{"a":2}' }, baseOptions)).toContain('A int')
  })

  it('null 值映射 interface{}', () => {
    const input: JsonToGoInput = { text: '{"note":null}' }
    expect(transform(input, baseOptions)).toContain('Note interface{}')
  })

  it('嵌套对象拆成独立结构体且先声明子结构体', () => {
    const input: JsonToGoInput = { text: '{"meta":{"stars":870}}' }
    expect(transform(input, baseOptions)).toBe(
      'type Meta struct {\n  Stars int `json:"stars,omitempty"`\n}\n\n' +
        'type Root struct {\n  Meta Meta `json:"meta,omitempty"`\n}\n',
    )
  })

  it('对象数组元素缺失字段用指针类型表达', () => {
    const input: JsonToGoInput = { text: '{"items":[{"x":1},{"y":2}]}' }
    expect(transform(input, baseOptions)).toBe(
      'type Item struct {\n  X *int `json:"x,omitempty"`\n  Y *int `json:"y,omitempty"`\n}\n\n' +
        'type Root struct {\n  Items []Item `json:"items,omitempty"`\n}\n',
    )
  })

  it('标量数组生成切片类型', () => {
    const input: JsonToGoInput = { text: '{"tags":["a","b"]}' }
    expect(transform(input, baseOptions)).toContain('Tags []string')
  })

  it('mode 为 inline 时嵌套结构体写成匿名结构体', () => {
    const input: JsonToGoInput = { text: '{"meta":{"stars":870}}' }
    expect(transform(input, { ...baseOptions, mode: 'inline' })).toBe(
      'type Root struct {\n' +
        '  Meta struct {\n' +
        '    Stars int `json:"stars,omitempty"`\n' +
        '  } `json:"meta,omitempty"`\n' +
        '}\n',
    )
  })

  it('style 为 plain 时 tag 不带 omitempty', () => {
    const input: JsonToGoInput = { text: '{"a":1}' }
    expect(transform(input, { ...baseOptions, style: 'plain' })).toContain('`json:"a"`')
  })

  it('indent 为 tab 时用制表符缩进', () => {
    const input: JsonToGoInput = { text: '{"a":1}' }
    expect(transform(input, { ...baseOptions, indent: 'tab' })).toBe(
      'type Root struct {\n\tA int `json:"a,omitempty"`\n}\n',
    )
  })

  it('无可用字段名时按序号回退为 FieldN', () => {
    const input: JsonToGoInput = { text: '{"工具":1}' }
    expect(transform(input, baseOptions)).toContain('Field1 int')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '\n\t ' }, baseOptions)).toBe('')
  })

  it('非法 JSON 抛出 JsonToGoError（异常）', () => {
    expect(() => transform({ text: '{"a":' }, baseOptions)).toThrow(JsonToGoError)
  })

  it('根节点不是对象时抛出 JsonToGoError（异常）', () => {
    expect(() => transform({ text: '123' }, baseOptions)).toThrow(JsonToGoError)
  })

  it('超长输入抛出 JsonToGoError（异常）', () => {
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToGoError,
    )
  })
})
