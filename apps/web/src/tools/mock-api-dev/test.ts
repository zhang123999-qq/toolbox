import { describe, expect, it } from 'vitest'
import type { MockApiDevOptions } from './schema'
import { genMockRows, genValue, parseFields, transform } from './utils'

const DEF = 'id:id, name:string, email:email, age:number'
const base: MockApiDevOptions = { count: '5', target: 'plain-json' }

describe('mock-api-dev / parseFields', () => {
  it('逗号与换行分隔', () => {
    expect(parseFields('a:string, b:number\nc:email')).toEqual([
      { name: 'a', type: 'string' },
      { name: 'b', type: 'number' },
      { name: 'c', type: 'email' },
    ])
  })
  it('缺冒号报错', () => {
    expect(() => parseFields('nosep')).toThrow(/name:type/)
  })
  it('未知类型报错', () => {
    expect(() => parseFields('x:uuid')).toThrow(/不支持的字段类型/)
  })
})

describe('mock-api-dev / genValue', () => {
  it('各类型给出确定性值', () => {
    expect(genValue('number', 'age', 0)).toBe(0)
    expect(genValue('boolean', 'active', 0)).toBe(true)
    expect(genValue('boolean', 'active', 1)).toBe(false)
    expect(genValue('email', 'email', 0)).toBe('user1@example.com')
    expect(genValue('id', 'id', 0)).toBe(1)
  })
})

describe('mock-api-dev / genMockRows', () => {
  it('生成指定条数', () => {
    const rows = genMockRows(parseFields(DEF), 4)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toEqual({ id: 1, name: 'name_1', email: 'user1@example.com', age: 0 })
  })
})

describe('mock-api-dev / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('plain-json 输出 JSON 数组', () => {
    const out = transform({ text: DEF }, base)
    const parsed = JSON.parse(out) as unknown[]
    expect(parsed).toHaveLength(5)
  })
  it('express 输出可运行片段', () => {
    expect(transform({ text: DEF }, { count: '1', target: 'express' })).toContain(
      "app.get('/api/items'",
    )
  })
  it('json-server 输出 db.json 结构', () => {
    const out = transform({ text: DEF }, { count: '1', target: 'json-server' })
    expect(out).toContain('"items"')
  })
  it('非法定义报错', () => {
    expect(() => transform({ text: 'bad' }, base)).toThrow(/name:type/)
  })
  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
