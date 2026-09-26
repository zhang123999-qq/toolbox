import { describe, expect, it } from 'vitest'
import {
  buildDemoArmor,
  crc24,
  parseArmor,
  parsePackets,
  PgpToolError,
  radix64Decode,
  radix64Encode,
  transform,
} from './utils'
import type { PgpToolInput } from './schema'

const input = (text: string): PgpToolInput => ({ text })

describe('pgp-tool / radix64 与 crc24', () => {
  it('base64 往返', () => {
    const data = new Uint8Array([0, 1, 2, 250, 251, 252, 77, 200])
    expect([...radix64Decode(radix64Encode(data))]).toEqual([...data])
  })

  it('crc24 对空输入为初值，对已知串稳定', () => {
    expect(crc24(new Uint8Array(0)).toString(16)).toBe('b704ce')
    const a = crc24(new TextEncoder().encode('hello'))
    const b = crc24(new TextEncoder().encode('hello'))
    expect(a).toBe(b)
    expect(crc24(new TextEncoder().encode('hellp'))).not.toBe(a)
  })
})

describe('pgp-tool / parseArmor', () => {
  it('解析合成 armor：头字段、CRC 匹配', () => {
    const blocks = parseArmor(buildDemoArmor())
    expect(blocks).toHaveLength(1)
    expect(blocks[0].label).toBe('PUBLIC KEY BLOCK')
    expect(blocks[0].headers.Version).toContain('demo')
    expect(blocks[0].crcValid).toBe(true)
  })

  it('CRC 不匹配时报损坏', () => {
    const broken = buildDemoArmor().replace(/^=[A-Za-z0-9+/]{4}$/m, '=AAAA')
    const blocks = parseArmor(broken)
    expect(blocks[0].crcValid).toBe(false)
  })

  it('缺少结束行抛错；非 armor 文本 transform 抛错（异常）', () => {
    expect(() => parseArmor('-----BEGIN PGP MESSAGE-----\nabc')).toThrow(PgpToolError)
    expect(() => transform(input('nothing here'), {})).toThrow(PgpToolError)
  })
})

describe('pgp-tool / parsePackets', () => {
  it('识别公钥包（tag6, RSA, v4）与用户 ID 包（tag13）', () => {
    const body = parseArmor(buildDemoArmor())[0].body
    const packets = parsePackets(body)
    expect(packets.map((p) => p.tag)).toEqual([6, 13])
    expect(packets[0].key?.algorithm).toContain('RSA')
    expect(packets[0].key?.version).toBe(4)
    expect(packets[1].userId).toContain('Demo User')
  })
})

describe('pgp-tool / transform', () => {
  it('输出包含总览与 packet 明细', () => {
    const out = transform(input(buildDemoArmor()), {})
    expect(out).toContain('共解析 1 段 PGP Armor')
    expect(out).toContain('公钥')
    expect(out).toContain('CRC24')
  })

  it('空输入返回空串；超长抛错（边界）', () => {
    expect(transform(input('  '), {})).toBe('')
    expect(() => transform(input('x'.repeat(200_001)), {})).toThrow(PgpToolError)
  })
})
