import { describe, expect, it } from 'vitest'
import { JsonValidateError, MAX_INPUT, transform } from './utils'
import type { ValidateInput, ValidateOptions } from './schema'

const baseOptions: ValidateOptions = { strict: false }

function text(value: string): ValidateInput {
  return { text: value }
}

describe('json-validate / transform', () => {
  it('合法 JSON 输出校验报告', () => {
    const report = transform(text('{"a":1,"b":[1,2]}'), baseOptions)
    expect(report).toContain('JSON 合法')
    expect(report).toContain('顶层类型：object')
    expect(report).toContain('顶层条目数：2')
    expect(report).toContain('键总数：2')
    expect(report).toContain('节点总数：5')
    // 最大深度按容器嵌套层数算：object 套 array 记作 2
    expect(report).toContain('最大深度：2')
    expect(report).toContain('字符数：17')
  })

  it('顶层数组时顶层条目数按元素个数统计', () => {
    expect(transform(text('[1,2,3]'), baseOptions)).toContain('顶层条目数：3')
  })

  it('语法错误给出行列位置（异常）', () => {
    const input = text('{\n  "a": 1\n  "b": 2\n}')
    expect(() => transform(input, baseOptions)).toThrow(JsonValidateError)
    expect(() => transform(input, baseOptions)).toThrow(/第 3 行第 3 列/)
  })

  it('空值、null、布尔等字面量都能通过校验（边界）', () => {
    expect(transform(text('null'), baseOptions)).toContain('顶层类型：null')
    expect(transform(text('true'), baseOptions)).toContain('顶层类型：boolean')
    expect(transform(text(''), baseOptions)).toBe('')
    expect(transform(text('   \n '), baseOptions)).toBe('')
  })

  it('前导零、尾随逗号、单引号都被拦下（异常）', () => {
    expect(() => transform(text('{"a":01}'), baseOptions)).toThrow(JsonValidateError)
    expect(() => transform(text('{"a":1,}'), baseOptions)).toThrow(JsonValidateError)
    expect(() => transform(text("{'a':1}"), baseOptions)).toThrow(JsonValidateError)
  })

  it('非严格模式提示重复键，严格模式直接报错', () => {
    const input = text('{"a":1,"a":2}')
    expect(transform(input, baseOptions)).toContain('警告：存在重复键 a')
    expect(() => transform(input, { strict: true })).toThrow(/严格模式下不允许重复键 a/)
  })

  it('超长输入抛出 JsonValidateError（边界）', () => {
    expect(() => transform(text('x'.repeat(MAX_INPUT + 1)), baseOptions)).toThrow(JsonValidateError)
  })
})
