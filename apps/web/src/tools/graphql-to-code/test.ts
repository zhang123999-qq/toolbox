import { describe, expect, it } from 'vitest'
import { GraphqlToCodeError, parseDocument, toTsType, transform } from './utils'
import type { GraphqlToCodeInput, GraphqlToCodeOptions } from './schema'

const baseOptions: GraphqlToCodeOptions = { mode: 'both', strict: true }

const QUERY: GraphqlToCodeInput = {
  text: `query GetUser($id: ID!, $first: Int = 10) {
  user(id: $id) {
    id
    name
    posts(first: $first) {
      title
    }
  }
}`,
}

describe('graphql-to-code / transform', () => {
  it('生成变量类型与结果类型', () => {
    const out = transform(QUERY, baseOptions)
    expect(out).toContain('export interface GetUserQueryVariables {')
    expect(out).toContain('export interface GetUserQuery {')
    expect(out).toContain('  id: string')
    expect(out).toContain('    posts: {')
    expect(out).toContain('      title: unknown')
  })

  it('strict 关闭时可空类型不带 null 且变量全部可选', () => {
    const out = transform(
      { text: 'query A($q: String) { search(q: $q) { id } }' },
      {
        mode: 'both',
        strict: false,
      },
    )
    expect(out).toContain('  q?: string')
    expect(out).not.toContain('| null')
  })

  it('mode=result 时不输出变量接口', () => {
    const out = transform(QUERY, { mode: 'result', strict: true })
    expect(out).not.toContain('Variables')
    expect(out).toContain('export interface GetUserQuery {')
  })

  it('别名使用别名作为属性名', () => {
    const out = transform({ text: '{ me: user { id } }' }, baseOptions)
    expect(out).toContain('export interface Query {')
    expect(out).toContain('  me: {')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '  \n ' }, baseOptions)).toBe('')
  })

  it('语法错误抛出 GraphqlToCodeError（异常）', () => {
    expect(() => transform({ text: 'query { user { id ' }, baseOptions)).toThrow(GraphqlToCodeError)
    expect(() => transform({ text: 'type Foo { id: ID }' }, baseOptions)).toThrow(
      GraphqlToCodeError,
    )
  })

  it('片段展开被跳过并写入告警注释', () => {
    const out = transform({ text: 'query A { user { ...UserFields } }' }, baseOptions)
    expect(out).toContain('忽略片段展开 ...UserFields')
    expect(out).toContain('user: {}')
  })

  it('列表与可空类型映射正确', () => {
    expect(toTsType('[Int!]!', true)).toBe('Array<number>')
    expect(toTsType('[Int]', true)).toBe('(Array<(number) | null>) | null')
    expect(toTsType('[Int]', false)).toBe('Array<number>')
  })

  it('内联片段的字段并入父对象', () => {
    const doc = parseDocument('{ node { id ... on User { name } } }')
    const selection = doc.operations[0]?.selection ?? []
    expect(selection).toHaveLength(1)
    expect(selection[0]?.selection?.map((field) => field.name)).toEqual(['id', 'name'])
  })
})
