import { describe, expect, it } from 'vitest'
import { GraphqlSchemaError, parseSchema, transform } from './utils'
import type { GraphqlSchemaInput } from './schema'

const input = (text: string): GraphqlSchemaInput => ({ text })

const SDL = `
interface Node { id: ID! }

type User implements Node {
  id: ID!
  name: String!
  posts(limit: Int = 10): [Post!]!
}

enum Role {
  ADMIN
  USER
}

input UserInput {
  name: String!
}

union SearchResult = User | Post

scalar DateTime
`

describe('graphql-schema / parseSchema', () => {
  it('按种类解析全部定义', () => {
    const defs = parseSchema(SDL)
    const kinds = defs.map((d) => `${d.kind}:${d.name}`)
    expect(kinds).toContain('interface:Node')
    expect(kinds).toContain('type:User')
    expect(kinds).toContain('enum:Role')
    expect(kinds).toContain('input:UserInput')
    expect(kinds).toContain('union:SearchResult')
    expect(kinds).toContain('scalar:DateTime')
  })

  it('对象类型字段：忽略参数、保留返回类型', () => {
    const user = parseSchema(SDL).find((d) => d.name === 'User')
    expect(user?.fields).toEqual([
      { name: 'id', type: 'ID!' },
      { name: 'name', type: 'String!' },
      { name: 'posts', type: '[Post!]!' },
    ])
  })

  it('枚举成员与联合成员', () => {
    const defs = parseSchema(SDL)
    expect(defs.find((d) => d.name === 'Role')?.values).toEqual(['ADMIN', 'USER'])
    expect(defs.find((d) => d.name === 'SearchResult')?.values).toEqual(['User', 'Post'])
  })

  it('支持 extend type 标记', () => {
    const defs = parseSchema('extend type Query { me: User }')
    expect(defs[0]).toMatchObject({ kind: 'type', name: 'Query', extend: true })
  })

  it('忽略 # 注释', () => {
    const defs = parseSchema('# just a comment\ntype T { a: Int }\n# tail')
    expect(defs).toHaveLength(1)
  })
})

describe('graphql-schema / transform', () => {
  it('输出分组清单与字段', () => {
    const out = transform(input(SDL))
    expect(out).toContain('# GraphQL Schema 结构预览')
    expect(out).toContain('## 对象类型（type）')
    expect(out).toContain('**User**（3 个字段）')
    expect(out).toContain('posts: [Post!]!')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform(input(''))).toBe('')
  })

  it('没有定义 / 花括号未闭合 / 超长抛错（异常）', () => {
    expect(() => transform(input('# nothing here'))).toThrow(GraphqlSchemaError)
    expect(() => transform(input('type User { id: ID!'))).toThrow(GraphqlSchemaError)
    expect(() => transform(input('x'.repeat(500_001)))).toThrow(GraphqlSchemaError)
  })
})
