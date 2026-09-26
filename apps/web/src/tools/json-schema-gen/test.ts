import { describe, expect, it } from 'vitest'
import { JsonSchemaGenError, MAX_INPUT, transform } from './utils'
import type { SchemaGenOptions } from './schema'

/** 生成结果里本工具会用到的字段，供断言访问嵌套结构 */
interface Generated {
  readonly $schema?: string
  readonly type?: string
  readonly required?: readonly string[]
  readonly properties?: Record<string, unknown>
  readonly items?: Generated
  readonly anyOf?: readonly Generated[]
}

const baseOptions: SchemaGenOptions = { format: 'draft-07', strict: false }

function generate(text: string, overrides: Partial<SchemaGenOptions> = {}): Generated {
  return JSON.parse(transform({ text }, { ...baseOptions, ...overrides })) as Generated
}

describe('json-schema-gen / transform', () => {
  it('从对象样本推断出 properties 与 required', () => {
    expect(generate('{"a":1,"b":"x"}')).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { a: { type: 'integer' }, b: { type: 'string' } },
      required: ['a', 'b'],
      additionalProperties: false,
    })
  })

  it('数组元素合并为一个 items 描述', () => {
    expect(generate('[1,2,3]')).toMatchObject({
      type: 'array',
      items: { type: 'integer' },
    })
  })

  it('数组元素里对象的键取并集，非严格模式下 required 取交集', () => {
    const schema = generate('[{"a":1},{"b":2}]')
    expect(Object.keys(schema.items?.properties ?? {})).toEqual(['a', 'b'])
    expect(schema.items?.required).toBeUndefined()
  })

  it('strict 开启时 required 取所有见过的键', () => {
    const schema = generate('[{"a":1},{"b":2}]', { strict: true })
    expect(schema.items?.required).toEqual(['a', 'b'])
  })

  it('元素类型不一致时用 anyOf 表达', () => {
    expect(generate('[1,"x"]')).toMatchObject({
      type: 'array',
      items: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
    })
  })

  it('空容器与标量样本也能产出（边界）', () => {
    expect(generate('[]')).toMatchObject({ type: 'array' })
    expect(generate('null')).toMatchObject({ type: 'null' })
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '  ' }, baseOptions)).toBe('')
  })

  it('format 切到 draft-2020-12 时 $schema 随之变化', () => {
    expect(generate('{"a":1}', { format: 'draft-2020-12' }).$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema',
    )
  })

  it('非法 JSON 与超长输入抛 JsonSchemaGenError（异常/边界）', () => {
    expect(() => transform({ text: '{"a":' }, baseOptions)).toThrow(JsonSchemaGenError)
    expect(() => transform({ text: 'x'.repeat(MAX_INPUT + 1) }, baseOptions)).toThrow(
      JsonSchemaGenError,
    )
  })
})
