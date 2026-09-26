import { describe, expect, it } from 'vitest'
import { JsonToTomlError, transform } from './utils'
import type { JsonToTomlOptions } from './schema'

const basic: JsonToTomlOptions = { style: 'basic' }

describe('json-to-toml / transform', () => {
  it('根键值对输出', () => {
    expect(transform({ text: '{"a":1,"b":"x","c":true}' }, basic)).toBe('a = 1\nb = "x"\nc = true')
  })

  it('嵌套对象转 [table] 且键值对在表头之后', () => {
    expect(transform({ text: '{"m":{"x":1}}' }, basic)).toBe('[m]\nx = 1')
  })

  it('根标量排在子表之前（TOML 顺序约束）', () => {
    expect(transform({ text: '{"a":1,"m":{"x":2},"b":3}' }, basic)).toBe('a = 1\nb = 3\n[m]\nx = 2')
  })

  it('标量数组转内联数组', () => {
    expect(transform({ text: '{"tags":["a","b"],"nums":[1,2]}' }, basic)).toBe(
      'tags = ["a", "b"]\nnums = [1, 2]',
    )
  })

  it('对象数组转 [[array-of-tables]]', () => {
    expect(transform({ text: '{"items":[{"a":1},{"a":2}]}' }, basic)).toBe(
      '[[items]]\na = 1\n\n[[items]]\na = 2',
    )
  })

  it('数组元素里的嵌套对象转相对子表', () => {
    expect(transform({ text: '{"servers":[{"host":"a","meta":{"port":80}}]}' }, basic)).toBe(
      '[[servers]]\nhost = "a"\n[servers.meta]\nport = 80',
    )
  })

  it('null 键被跳过（TOML 无 null）', () => {
    expect(transform({ text: '{"a":null,"b":1}' }, basic)).toBe('b = 1')
  })

  it('非裸键加引号', () => {
    expect(transform({ text: '{"a.b":1}' }, basic)).toBe('"a.b" = 1')
  })

  it('literal 风格优先单引号', () => {
    expect(transform({ text: '{"s":"hello"}' }, { style: 'literal' })).toBe("s = 'hello'")
  })

  it('literal 风格遇单引号回退双引号', () => {
    expect(transform({ text: '{"s":"it\'s"}' }, { style: 'literal' })).toBe('s = "it\'s"')
  })

  it('空对象输出空串（边界）', () => {
    expect(transform({ text: '{}' }, basic)).toBe('')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, basic)).toBe('')
  })

  it('根不是对象 / 混排数组 / 非法 JSON / 超长抛错（异常）', () => {
    expect(() => transform({ text: '[1,2]' }, basic)).toThrow(JsonToTomlError)
    expect(() => transform({ text: '"s"' }, basic)).toThrow(JsonToTomlError)
    expect(() => transform({ text: '{"a":[1,{}]}' }, basic)).toThrow(JsonToTomlError)
    expect(() => transform({ text: '{x' }, basic)).toThrow(JsonToTomlError)
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, basic)).toThrow(
      JsonToTomlError,
    )
  })
})
