import { describe, expect, it } from 'vitest'
import { GraphqlFormatError, tokenize, transform } from './utils'
import type { GraphqlFormatterInput, GraphqlFormatterOptions } from './schema'

const opts2: GraphqlFormatterOptions = { indent: '2' }
const opts4: GraphqlFormatterOptions = { indent: '4' }
const input = (text: string): GraphqlFormatterInput => ({ text })

const QUERY =
  'query GetUser($id:ID!,$withPosts:Boolean=false){user(id:$id){id name email ...UserFields}}'
const SDL = `type User{id:ID! name:String! role:Role posts:[Post!]!} enum Role{ADMIN USER} `

describe('graphql-formatter / tokenize', () => {
  it('保留逗号 token、丢弃空白，切出名字与标点', () => {
    const tokens = tokenize('{ a, b(x: 1) }').map((t) => t.value)
    expect(tokens).toEqual(['{', 'a', ',', 'b', '(', 'x', ':', '1', ')', '}'])
  })

  it('识别三引号块字符串与注释', () => {
    const tokens = tokenize('# c\n"""a"b"""\n"x\\"y"')
    expect(tokens.map((t) => t.kind)).toEqual(['comment', 'string', 'string'])
  })
})

describe('graphql-formatter / transform · 查询', () => {
  it('选择集换行缩进、变量与参数保持单行', () => {
    const out = transform(input(QUERY), opts2)
    expect(out).toBe(
      [
        'query GetUser($id: ID!, $withPosts: Boolean = false) {',
        '  user(id: $id) {',
        '    id',
        '    name',
        '    email',
        '    ...UserFields',
        '  }',
        '}',
      ].join('\n'),
    )
  })

  it('内联片段 ... on 正确换行与空格', () => {
    const out = transform(input('{node{... on Admin{role}}}'), opts2)
    expect(out).toBe('{\n  node {\n    ... on Admin {\n      role\n    }\n  }\n}')
  })

  it('指令紧贴字段名', () => {
    const out = transform(input('{users@skip(if:$off){id}}'), opts2)
    expect(out).toContain('  users @skip(if: $off) {')
  })

  it('4 空格缩进', () => {
    const out = transform(input('{a{b}}'), opts4)
    expect(out).toBe('{\n    a {\n        b\n    }\n}')
  })
})

describe('graphql-formatter / transform · SDL', () => {
  it('类型体与枚举逐字段换行，列表 / 非空类型紧贴', () => {
    const out = transform(input(SDL), opts2)
    expect(out).toContain('type User {')
    expect(out).toContain('  id: ID!')
    expect(out).toContain('  posts: [Post!]!')
    expect(out).toContain('enum Role {')
    expect(out).toContain('  ADMIN')
    expect(out).toContain('  USER')
  })
})

describe('graphql-formatter / 边界与异常', () => {
  it('空输入返回空串', () => {
    expect(transform(input(''), opts2)).toBe('')
  })

  it('括号不匹配 / 未闭合 / 字符串未闭合 / 超长抛错', () => {
    expect(() => transform(input('{a'), opts2)).toThrow(GraphqlFormatError)
    expect(() => transform(input('{a)}'), opts2)).toThrow(GraphqlFormatError)
    expect(() => transform(input('{a: "x}'), opts2)).toThrow(GraphqlFormatError)
    expect(() => transform(input('x'.repeat(500_001)), opts2)).toThrow(GraphqlFormatError)
  })
})
