import { describe, expect, it } from 'vitest'
import { JsonToTsError, transform } from './utils'
import type { JsonToTsInput, JsonToTsOptions } from './schema'

const baseOptions: JsonToTsOptions = {
  type: 'interface',
  mode: 'none',
  style: 'mutable',
  strict: false,
  indent: '2',
}

describe('json-to-ts / transform', () => {
  it('标量对象生成 interface', () => {
    const input: JsonToTsInput = { text: '{"a":1,"b":"x"}' }
    expect(transform(input, baseOptions)).toBe('interface Root {\n  a: number;\n  b: string;\n}\n')
  })

  it('嵌套对象先声明子类型再声明父类型', () => {
    const input: JsonToTsInput = { text: '{"meta":{"stars":870}}' }
    expect(transform(input, baseOptions)).toBe(
      'interface Meta {\n  stars: number;\n}\n\ninterface Root {\n  meta: Meta;\n}\n',
    )
  })

  it('数组元素是对象时取单数类型名并声明为数组', () => {
    const input: JsonToTsInput = { text: '{"items":[{"x":1}]}' }
    expect(transform(input, baseOptions)).toBe(
      'interface Item {\n  x: number;\n}\n\ninterface Root {\n  items: Item[];\n}\n',
    )
  })

  it('同一数组多条样本缺失的字段合并为可选可空', () => {
    const input: JsonToTsInput = { text: '{"items":[{"x":1},{"y":2}]}' }
    expect(transform(input, baseOptions)).toBe(
      'interface Item {\n  x?: number | null;\n  y?: number | null;\n}\n\n' +
        'interface Root {\n  items: Item[];\n}\n',
    )
  })

  it('混合标量数组输出带括号的联合类型', () => {
    const input: JsonToTsInput = { text: '{"a":[1,"x"]}' }
    expect(transform(input, baseOptions)).toBe('interface Root {\n  a: (number | string)[];\n}\n')
  })

  it('type 模式输出类型别名而非 interface', () => {
    const input: JsonToTsInput = { text: '{"a":1}' }
    expect(transform(input, { ...baseOptions, type: 'type' })).toBe(
      'type Root = {\n  a: number;\n}\n',
    )
  })

  it('mode 为 export 时给声明加导出前缀', () => {
    const input: JsonToTsInput = { text: '{"a":1}' }
    expect(transform(input, { ...baseOptions, mode: 'export' })).toBe(
      'export interface Root {\n  a: number;\n}\n',
    )
  })

  it('style 为 readonly 时字段加只读修饰', () => {
    const input: JsonToTsInput = { text: '{"a":1}' }
    expect(transform(input, { ...baseOptions, style: 'readonly' })).toBe(
      'interface Root {\n  readonly a: number;\n}\n',
    )
  })

  it('strict 关闭时 null 字段为可选，开启后恢复必填', () => {
    const input: JsonToTsInput = { text: '{"note":null}' }
    expect(transform(input, baseOptions)).toContain('note?: null;')
    expect(transform(input, { ...baseOptions, strict: true })).toContain('note: null;')
  })

  it('indent 为 tab 时用制表符缩进', () => {
    const input: JsonToTsInput = { text: '{"a":1}' }
    expect(transform(input, { ...baseOptions, indent: 'tab' })).toBe(
      'interface Root {\n\ta: number;\n}\n',
    )
  })

  it('非法键名用引号包裹', () => {
    const input: JsonToTsInput = { text: '{"a-b":1}' }
    expect(transform(input, baseOptions)).toBe('interface Root {\n  "a-b": number;\n}\n')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '   \n  ' }, baseOptions)).toBe('')
  })

  it('非法 JSON 抛出 JsonToTsError（异常）', () => {
    expect(() => transform({ text: '{bad json' }, baseOptions)).toThrow(JsonToTsError)
  })

  it('根节点不是对象时抛出 JsonToTsError（异常）', () => {
    expect(() => transform({ text: '[1,2]' }, baseOptions)).toThrow(JsonToTsError)
    expect(() => transform({ text: '"str"' }, baseOptions)).toThrow(JsonToTsError)
  })

  it('超长输入抛出 JsonToTsError（异常）', () => {
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToTsError,
    )
  })
})
