import { describe, expect, it } from 'vitest'
import { JsonSchemaValidateError, MAX_INPUT, transform } from './utils'
import type { SchemaValidateOptions } from './schema'

const baseOptions: SchemaValidateOptions = { mode: 'all', strict: false }

function check(
  text: string,
  textB: string,
  overrides: Partial<SchemaValidateOptions> = {},
): string {
  return transform({ text, textB }, { ...baseOptions, ...overrides })
}

const OBJECT_SCHEMA = JSON.stringify({
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: { name: { type: 'string' }, age: { type: 'integer', minimum: 0, maximum: 120 } },
})

describe('json-schema-validate / transform', () => {
  it('数据符合 Schema 时给出通过结论', () => {
    expect(check('{"name":"工具库","age":3}', OBJECT_SCHEMA)).toBe('校验通过：符合 Schema 要求')
  })

  it('缺少必填字段时按路径报出', () => {
    expect(check('{"age":3}', OBJECT_SCHEMA)).toContain('$：缺少必填字段 name')
  })

  it('类型不匹配与范围越界都写出来', () => {
    expect(check('{"name":"a","age":200}', OBJECT_SCHEMA)).toContain('$.age：大于 maximum 120')
    expect(check('{"name":1}', OBJECT_SCHEMA)).toContain(
      '$.name：类型不匹配，期望 string，实际 integer',
    )
  })

  it('附加字段在 additionalProperties 为 false 时被拦下', () => {
    expect(check('{"name":"a","x":1}', OBJECT_SCHEMA)).toContain('$：不允许出现额外字段 x')
  })

  it('additionalProperties 为 schema 时按它继续校验', () => {
    const schema = JSON.stringify({
      type: 'object',
      additionalProperties: { type: 'number' },
    })
    expect(check('{"x":"str"}', schema)).toContain('$.x：类型不匹配，期望 number，实际 string')
    expect(check('{"x":1}', schema)).toBe('校验通过：符合 Schema 要求')
  })

  it('items 对每个元素递归校验并带上角标路径', () => {
    const schema = JSON.stringify({ type: 'array', items: { type: 'number' } })
    expect(check('[1,"two",3]', schema)).toContain('$[1]：类型不匹配，期望 number，实际 string')
  })

  it('enum / pattern / minLength / maxLength 都能生效', () => {
    expect(check('"c"', JSON.stringify({ enum: ['a', 'b'] }))).toContain('取值不在 enum')
    expect(check('"ab"', JSON.stringify({ pattern: '^\\d+$' }))).toContain('不匹配 pattern')
    expect(check('"a"', JSON.stringify({ minLength: 2 }))).toContain('短于 minLength 2')
    expect(check('"abc"', JSON.stringify({ maxLength: 2 }))).toContain('长于 maxLength 2')
  })

  it('mode 为 first 时只给第一条', () => {
    const schema = JSON.stringify({ type: 'array', items: { type: 'number' } })
    const result = check('["a","b"]', schema, { mode: 'first' })
    expect(result).toContain('仅显示第 1 处')
    expect(result.split('\n')).toHaveLength(2)
  })

  it('strict 开启时不支持的关键字报错，关闭时忽略', () => {
    const schema = JSON.stringify({
      type: 'object',
      patternProperties: { '^x': { type: 'string' } },
    })
    expect(() => check('{"x":1}', schema, { strict: true })).toThrow(
      /不支持的关键字 patternProperties/,
    )
    expect(check('{"x":1}', schema)).toBe('校验通过：符合 Schema 要求')
  })

  it('两侧都空返回空串，单侧为空或非 JSON 抛 JsonSchemaValidateError（边界/异常）', () => {
    expect(check('', '')).toBe('')
    expect(() => check('', '{}')).toThrow(JsonSchemaValidateError)
    expect(() => check('{}', '')).toThrow(JsonSchemaValidateError)
    expect(() => check('{', '{}')).toThrow(/待校验的内容不是合法的 JSON/)
    expect(() => check('{}', '{')).toThrow(/Schema 不是合法的 JSON/)
    expect(() => check('x'.repeat(MAX_INPUT + 1), '{}')).toThrow(JsonSchemaValidateError)
  })
})
