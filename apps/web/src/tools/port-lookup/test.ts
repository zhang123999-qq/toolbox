import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('port-lookup / 按端口号', () => {
  it('查 6379 → Redis', () => {
    expect(transform({ text: '6379' }, {})).toContain('Redis')
  })

  it('查 80 → HTTP', () => {
    expect(transform({ text: '80' }, {})).toContain('HTTP')
  })

  it('查 3306 → MySQL', () => {
    expect(transform({ text: '3306' }, {})).toContain('MySQL')
  })

  it('未收录端口抛错', () => {
    expect(() => transform({ text: '12345' }, {})).toThrow(/未收录/)
  })

  it('端口越界抛错', () => {
    expect(() => transform({ text: '99999' }, {})).toThrow(/0-65535/)
  })
})

describe('port-lookup / 按服务名', () => {
  it('redis 模糊匹配', () => {
    expect(transform({ text: 'redis' }, {})).toContain('6379')
  })

  it('mysql 命中 3306', () => {
    expect(transform({ text: 'mysql' }, {})).toContain('3306')
  })

  it('tls 命中多条', () => {
    const out = transform({ text: 'tls' }, {})
    expect(out).toContain('443')
  })

  it('未找到抛错', () => {
    expect(() => transform({ text: 'not-a-service' }, {})).toThrow(/未找到/)
  })
})

describe('port-lookup / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
