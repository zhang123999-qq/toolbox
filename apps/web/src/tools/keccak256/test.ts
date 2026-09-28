/**
 * keccak256（#694）utils 单测：标准向量 / 输入解析 / 输出格式。
 * 哈希向量由 Python pycryptodome 独立生成。
 */
import { describe, expect, it } from 'vitest'
import { bytesToBase64, bytesToHex, hashKeccak256, keccak256, parseHashInput } from './utils'

function keccakHex(s: string): string {
  return bytesToHex(keccak256(new TextEncoder().encode(s)))
}

describe('keccak256 标准测试向量', () => {
  it('空字符串', () => {
    expect(keccakHex('')).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
  })

  it('"abc"', () => {
    expect(keccakHex('abc')).toBe(
      '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
    )
  })

  it('"hello"', () => {
    expect(keccakHex('hello')).toBe(
      '1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
    )
  })

  it('"hello world"', () => {
    expect(keccakHex('hello world')).toBe(
      '47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad',
    )
  })

  it('多分组输入（200 字节）：确定性', () => {
    const a = keccakHex('a'.repeat(200))
    expect(a).toHaveLength(64)
    expect(a).toBe(keccakHex('a'.repeat(200)))
    expect(a).not.toBe(keccakHex('a'.repeat(201)))
  })

  it('输出 32 字节', () => {
    expect(keccak256(new Uint8Array([1, 2, 3]))).toHaveLength(32)
  })

  it('与 SHA3-256 不同（padding 差异）', () => {
    // 若误用 0x06 padding，会得到 NIST SHA3 结果而非本向量
    expect(keccakHex('abc')).not.toBe(
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    )
  })
})

describe('parseHashInput', () => {
  it('text 按 UTF-8 编码（含中文）', () => {
    expect(Array.from(parseHashInput('hi', 'text'))).toEqual([104, 105])
    expect(parseHashInput('你好', 'text')).toHaveLength(6)
  })

  it('hex 解析（可带 0x）', () => {
    expect(bytesToHex(parseHashInput('0x616263', 'hex'))).toBe('616263')
    expect(bytesToHex(parseHashInput('616263', 'hex'))).toBe('616263')
  })

  it('空 hex 抛错', () => {
    expect(() => parseHashInput('  ', 'hex')).toThrow('不能为空')
    expect(() => parseHashInput('0x', 'hex')).toThrow('hex 格式错误')
  })

  it('奇数位 / 非法字符抛错', () => {
    expect(() => parseHashInput('abc', 'hex')).toThrow('hex 格式错误')
    expect(() => parseHashInput('zzzz', 'hex')).toThrow('hex 格式错误')
  })
})

describe('hashKeccak256', () => {
  it('text → hex', () => {
    expect(hashKeccak256('abc', 'text', 'hex')).toBe(
      '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
    )
  })

  it('hex 输入等价于对应文本', () => {
    expect(hashKeccak256('616263', 'hex', 'hex')).toBe(hashKeccak256('abc', 'text', 'hex'))
  })

  it('base64 输出', () => {
    const b64 = hashKeccak256('abc', 'text', 'base64')
    expect(b64).toBe(bytesToBase64(keccak256(new TextEncoder().encode('abc'))))
    expect(b64).toHaveLength(44)
  })
})
