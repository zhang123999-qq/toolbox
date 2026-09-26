import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATE,
  MockDataError,
  createRng,
  fillTemplate,
  generate,
  resolveString,
  seedFrom,
  tokenNames,
  transform,
} from './utils'
import type { GenContext, Rng } from './utils'
import type { MockDataInput, MockDataOptions } from './schema'

const stable: MockDataOptions = { count: '5', stable: true }
const single: MockDataOptions = { count: '1', stable: true }

/** 固定取第一个候选的桩 RNG：让断言写具体值而不用猜种子结果 */
const head: Rng = { next: () => 0 }

function ctxOf(rng: Rng, index = 0): GenContext {
  return { rng, index }
}

describe('mock-data / transform', () => {
  it('按模板生成指定条数的对象数组', () => {
    const input: MockDataInput = { text: JSON.stringify(DEFAULT_TEMPLATE) }
    const rows = JSON.parse(transform(input, stable)) as Record<string, unknown>[]
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      expect(row.name).toMatch(/^[一-龥]{2,3}$/)
      expect(row.email).toMatch(/^[\w]+@[\w.]+$/)
      expect(row.phone).toMatch(/^1[3-9]\d{9}$/)
      expect(row.gender).toMatch(/^(男|女)$/)
      expect(typeof row.age).toBe('number')
      expect(typeof row.vip).toBe('boolean')
      expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    }
  })

  it('单条生成时行列各字段齐全，UUID 符合 v4 字面约定', () => {
    const input: MockDataInput = { text: '{"id":"@uuid","n":"@cname"}' }
    const rows = JSON.parse(transform(input, single)) as Record<string, unknown>[]
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('stable 模式下同一份模板两次结果完全一致', () => {
    const input: MockDataInput = { text: JSON.stringify(DEFAULT_TEMPLATE) }
    expect(transform(input, stable)).toBe(transform(input, stable))
    expect(seedFrom('{"a":"@uuid"}')).toBe(seedFrom('{"a":"@uuid"}'))
    expect(seedFrom('{"a":"@uuid"}')).not.toBe(seedFrom('{"a":"@cname"}'))
  })

  it('用桩 RNG 时能写出确切的值（可读断言）', () => {
    expect(resolveString('@cname', ctxOf(head))).toBe('王伟')
    expect(fillTemplate({ who: '@cname', n: '@number(10,20)' }, ctxOf(head))).toEqual({
      who: '王伟',
      n: 10,
    })
  })

  it('一个串里塞多个占位符时逐个替换', () => {
    const out = String(resolveString('用户：@cname / 城市：@city', ctxOf(head)))
    expect(out).toBe('用户：王伟 / 城市：海淀区')
  })

  it('整串单一占位符输出原生类型，混排时为字符串', () => {
    expect(resolveString('@number(1,3)', ctxOf(head))).toBe(1)
    expect(resolveString('@boolean', ctxOf(head))).toBe(true)
    expect(resolveString('编号-@number(1,3)', ctxOf(head))).toBe('编号-1')
    expect(resolveString('@skip', ctxOf(head))).toBeNull()
  })

  it('认不出的 @xxx 在混排文本里原样保留，邮箱字面量不受影响', () => {
    expect(resolveString('联系：user@example.com', ctxOf(head))).toBe('联系：user@example.com')
  })

  it('@pick 从候选里取值，候选为空时报错（异常）', () => {
    const row = JSON.parse(
      transform({ text: '{"g":"@pick(男|女)"}' }, { count: '20', stable: true }),
    ) as { g: string }[]
    expect(row.every((item) => item.g === '男' || item.g === '女')).toBe(true)
    expect(() => resolveString('@pick()', ctxOf(head))).toThrow(MockDataError)
  })

  it('嵌套对象与数组按原结构递归填充', () => {
    const template =
      '{"user":{"name":"@cname","tags":["@word","@word"]},"list":[{"n":"@number(1,1)"}]}'
    const row = (JSON.parse(transform({ text: template }, single)) as Record<string, unknown>[])[0]
    const user = row?.user as { name: string; tags: unknown[] }
    expect(user.tags).toHaveLength(2)
    expect(typeof user.name).toBe('string')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, stable)).toBe('')
    expect(transform({ text: '   \n ' }, stable)).toBe('')
  })

  it('模板不是合法 JSON 时抛 MockDataError（异常）', () => {
    expect(() => transform({ text: '{oops' }, stable)).toThrow(MockDataError)
  })

  it('未知占位符独立成串时抛错并列出可用占位符（异常）', () => {
    expect(() => transform({ text: '{"a":"@nope"}' }, stable)).toThrow(MockDataError)
    expect(() => transform({ text: '{"a":"@nope"}' }, stable)).toThrow(/可用占位符/)
    expect(tokenNames()).toContain('uuid')
  })

  it('超长模板抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: '{"a":"' + 'x'.repeat(20_000) + '"}' }, stable)).toThrow(
      MockDataError,
    )
  })

  it('count 被限制在 1–200，非法 count 回落到 1（边界）', () => {
    const rows = generate('{"a":1}', { count: '9999' as MockDataOptions['count'], stable: true })
    expect(rows).toHaveLength(200)
  })

  it('createRng 输出落在 [0,1) 且同种子同序列', () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 5; i += 1) {
      const value = a.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      expect(value).toBe(b.next())
    }
  })
})
