import { describe, expect, it } from 'vitest'
import { AvroParseError, analyze, isNullable, renderTree, toJsonSchema, transform } from './utils'
import type { AvroParseInput, AvroParseOptions } from './schema'

const both: AvroParseOptions = { mode: 'both', indent: '2' }

const SCHEMA = {
  type: 'record',
  name: 'User',
  namespace: 'com.example',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'name', type: 'string' },
    { name: 'email', type: ['null', 'string'], default: null },
    { name: 'role', type: { type: 'enum', name: 'Role', symbols: ['ADMIN', 'USER'] } },
    { name: 'tags', type: { type: 'array', items: 'string' } },
  ],
}

const input = (text: string): AvroParseInput => ({ text })

describe('avro-parse / analyze', () => {
  it('解析根 record、字段数与命名类型', () => {
    const { root, stats } = analyze(SCHEMA)
    expect(root.kind).toBe('record')
    expect(root.label).toContain('com.example.User')
    expect(stats.fields).toBe(5)
    expect(stats.namedTypes).toContain('com.example.User')
    expect(stats.namedTypes).toContain('com.example.Role')
  })

  it('union 与 array / enum 节点类型正确', () => {
    const { root } = analyze(SCHEMA)
    const email = root.children.find((c) => c.label.startsWith('email'))
    const tags = root.children.find((c) => c.label.startsWith('tags'))
    const role = root.children.find((c) => c.label.startsWith('role'))
    expect(email?.kind).toBe('union')
    expect(tags?.kind).toBe('array')
    expect(role?.kind).toBe('enum')
  })

  it('isNullable 判定 union 含 null', () => {
    expect(isNullable(['null', 'string'])).toBe(true)
    expect(isNullable('string')).toBe(false)
  })
})

describe('avro-parse / renderTree', () => {
  it('用树形分支符渲染', () => {
    const tree = renderTree(analyze(SCHEMA).root)
    expect(tree).toContain('com.example.User')
    expect(tree).toMatch(/[├└]─ /)
  })
})

describe('avro-parse / toJsonSchema', () => {
  it('record 映射为 object 且可空字段不进 required', () => {
    const mapped = toJsonSchema(SCHEMA, '', new Map()) as Record<string, unknown>
    expect(mapped['type']).toBe('object')
    const required = mapped['required'] as string[]
    expect(required).toContain('id')
    expect(required).not.toContain('email')
    const props = mapped['properties'] as Record<string, { type?: string; anyOf?: unknown[] }>
    expect(props['tags']).toEqual({ type: 'array', items: { type: 'string' } })
    expect(Array.isArray(props['email'].anyOf)).toBe(true)
  })
})

describe('avro-parse / transform', () => {
  it('both 模式同时输出字段树与 JSON Schema', () => {
    const out = transform(input(JSON.stringify(SCHEMA)), both)
    expect(out).toContain('# Avro Schema 字段树')
    expect(out).toContain('类型统计：')
    expect(out).toContain('# JSON Schema 粗略映射')
    expect(out).toContain('"$schema"')
  })

  it('tree / jsonSchema 模式只输出对应段', () => {
    expect(transform(input(JSON.stringify(SCHEMA)), { ...both, mode: 'tree' })).not.toContain(
      '"$schema"',
    )
    const js = transform(input(JSON.stringify(SCHEMA)), { ...both, mode: 'jsonSchema' })
    expect(js).not.toContain('字段树')
    expect(js).toContain('"type": "object"')
  })

  it('4 空格缩进生效', () => {
    const js = transform(input(JSON.stringify(SCHEMA)), { mode: 'jsonSchema', indent: '4' })
    expect(js).toContain('\n    "type": "object"')
  })

  it('未定义引用给出告警注释但不崩溃', () => {
    const out = transform(
      input(
        JSON.stringify({ type: 'record', name: 'R', fields: [{ name: 'x', type: 'Missing' }] }),
      ),
      both,
    )
    expect(out).toContain('未定义的命名类型')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform(input(''), both)).toBe('')
  })

  it('非法 JSON / 缺 type / 过深嵌套 / 超长抛错（异常）', () => {
    expect(() => transform(input('{x'), both)).toThrow(AvroParseError)
    expect(() => transform(input('"string"'), both)).toThrow(AvroParseError)
    expect(() =>
      transform(input(JSON.stringify({ type: 'record', name: 'R', fields: [] })), both),
    ).not.toThrow()
    expect(() => transform(input(JSON.stringify({ fields: [] })), both)).toThrow(AvroParseError)
    expect(() => transform(input('x'.repeat(200_001)), both)).toThrow(AvroParseError)
  })
})
