import { describe, expect, it } from 'vitest'
import type { UlidOptions } from './schema'
import {
  CROCKFORD,
  encodeUlid,
  generateUlid,
  generateUlids,
  MAX_COUNT,
  parseCount,
  transform,
  ULID_LENGTH,
} from './utils'

const base: UlidOptions = { count: '1' }
const zeros = new Uint8Array(10)

function isCrockford(s: string): boolean {
  if (s.length !== ULID_LENGTH) return false
  for (const ch of s) if (!CROCKFORD.includes(ch)) return false
  return true
}

describe('ulid / parseCount', () => {
  it('合法数量通过', () => {
    expect(parseCount('1')).toBe(1)
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

describe('ulid / encodeUlid', () => {
  it('时间戳 0 + 全零随机 → 26 个 0', () => {
    expect(encodeUlid(0, zeros)).toBe('0'.repeat(ULID_LENGTH))
  })
  it('输出为 26 个 Crockford Base32 大写字符', () => {
    const out = encodeUlid(1700000000000, new Uint8Array(10).fill(0xff))
    expect(out).toHaveLength(ULID_LENGTH)
    expect(isCrockford(out)).toBe(true)
    expect(out).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/)
  })
  it('不含 I L O U', () => {
    const out = encodeUlid(Date.now(), new Uint8Array(10).fill(0xaa))
    for (const ch of 'ILOU') expect(out).not.toContain(ch)
  })
  it('时间戳越大字典序越大（可排序）', () => {
    const a = encodeUlid(1000, zeros)
    const b = encodeUlid(2000, zeros)
    expect(a < b).toBe(true)
  })
})

describe('ulid / generateUlid', () => {
  it('长度与字符集正确', () => {
    const id = generateUlid()
    expect(id).toHaveLength(ULID_LENGTH)
    expect(isCrockford(id)).toBe(true)
  })
  it('多次生成唯一性', () => {
    const list = generateUlids({ ...base, count: '50' })
    expect(list).toHaveLength(50)
    expect(new Set(list).size).toBe(50)
  })
  it('同毫秒内随机部分不同', () => {
    const a = generateUlid()
    const b = generateUlid()
    expect(a).toHaveLength(ULID_LENGTH)
    // 前 10 字符为时间戳（通常相同），后 16 字符为随机
    expect(a.slice(10)).not.toBe(b.slice(10))
  })
})

describe('ulid / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('正常输出单个 26 字符 ULID', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toHaveLength(ULID_LENGTH)
    expect(isCrockford(out)).toBe(true)
  })
  it('count=3 输出三行', () => {
    const lines = transform({ text: 'x' }, { count: '3' }).split('\n')
    expect(lines).toHaveLength(3)
    for (const line of lines) expect(isCrockford(line)).toBe(true)
  })
  it('非法数量抛错', () => {
    expect(() => transform({ text: 'x' }, { count: '0' })).toThrow(/数量必须在/)
  })
})
