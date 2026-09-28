import { describe, expect, it } from 'vitest'
import type { UuidOptions } from './schema'
import { formatUuid, generateUuids, MAX_COUNT, parseCount, transform } from './utils'

const base: UuidOptions = { count: '1', uppercase: false, hyphens: true }
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uuid / parseCount', () => {
  it('合法数量通过', () => {
    expect(parseCount('1')).toBe(1)
    expect(parseCount(' 10 ')).toBe(10)
    expect(parseCount(String(MAX_COUNT))).toBe(100)
  })
  it('非整数抛错', () => {
    expect(() => parseCount('abc')).toThrow(/数量必须是整数/)
    expect(() => parseCount('1.5')).toThrow(/数量必须是整数/)
  })
  it('越界抛错', () => {
    expect(() => parseCount('0')).toThrow(/数量必须在/)
    expect(() => parseCount('101')).toThrow(/数量必须在/)
  })
})

describe('uuid / formatUuid', () => {
  const sample = 'b8b74f2a-1c3e-4d5f-9a6b-7c8d9e0f1a2b'
  it('默认小写带横线', () => {
    expect(formatUuid(sample, base)).toBe(sample)
  })
  it('大写', () => {
    expect(formatUuid(sample, { ...base, uppercase: true })).toBe(sample.toUpperCase())
  })
  it('去横线', () => {
    expect(formatUuid(sample, { ...base, hyphens: false })).toBe('b8b74f2a1c3e4d5f9a6b7c8d9e0f1a2b')
  })
  it('大写且去横线', () => {
    expect(formatUuid(sample, { ...base, uppercase: true, hyphens: false })).toBe(
      'B8B74F2A1C3E4D5F9A6B7C8D9E0F1A2B',
    )
  })
})

describe('uuid / generateUuids', () => {
  it('数量正确且均为合法 v4', () => {
    const list = generateUuids({ ...base, count: '10' })
    expect(list).toHaveLength(10)
    for (const u of list) expect(u).toMatch(V4)
  })
  it('唯一性', () => {
    const list = generateUuids({ ...base, count: '50' })
    expect(new Set(list).size).toBe(50)
  })
  it('去横线后为 32 位 hex', () => {
    const list = generateUuids({ ...base, count: '5', hyphens: false })
    expect(list).toHaveLength(5)
    for (const u of list) expect(u).toMatch(/^[0-9a-f]{32}$/)
  })
  it('大写选项生效', () => {
    const list = generateUuids({ ...base, count: '3', uppercase: true })
    for (const u of list)
      expect(u).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/)
  })
})

describe('uuid / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('默认输出单行 v4', () => {
    expect(transform({ text: 'x' }, base)).toMatch(V4)
  })
  it('count=3 输出三行', () => {
    const lines = transform({ text: 'x' }, { ...base, count: '3' }).split('\n')
    expect(lines).toHaveLength(3)
    for (const u of lines) expect(u).toMatch(V4)
  })
  it('非法数量抛错', () => {
    expect(() => transform({ text: 'x' }, { ...base, count: '0' })).toThrow(/数量必须在/)
  })
})
