import { describe, expect, it } from 'vitest'
import { BITS, formatHex, hashXxhash, parseBits, transform } from './utils'

const h32 = { bits: '32', uppercase: false } as const
const h64 = { bits: '64', uppercase: false } as const
const upper = { ...h32, uppercase: true } as const

/** 与 xxHash 官方实现一致的已知值 */
const HELLO_32 = 'fb0077f9'
const HELLO_64 = '26c7827d889f6da3'

describe('xxhash-hash / 工具函数', () => {
  it('按位宽补足十六进制位数', () => {
    expect(formatHex(0x0a, '32', false)).toBe('0000000a')
    expect(formatHex(0x0a, '64', false)).toBe('000000000000000a')
    expect(formatHex(0xab, '32', true)).toBe('000000AB')
  })

  it('位宽取值受白名单约束', () => {
    expect(parseBits('64')).toBe('64')
    expect(() => parseBits('128')).toThrow(/不支持的位宽/)
    expect(BITS).toEqual(['32', '64'])
  })
})

describe('xxhash-hash / 哈希', () => {
  it('"hello" 的 xxHash32 与官方一致', async () => {
    await expect(hashXxhash('hello', h32)).resolves.toBe(HELLO_32)
  })

  it('"hello" 的 xxHash64 与官方一致', async () => {
    await expect(hashXxhash('hello', h64)).resolves.toBe(HELLO_64)
  })

  it('大写输出只是大小写不同', async () => {
    expect(await hashXxhash('hello', upper)).toBe(HELLO_32.toUpperCase())
  })

  it('输入变化则哈希变化（雪崩）', async () => {
    expect(await hashXxhash('hello!', h32)).not.toBe(HELLO_32)
  })

  it('相同输入结果稳定（同一进程内可复现）', async () => {
    expect(await hashXxhash('repeat', h32)).toBe(await hashXxhash('repeat', h32))
  })
})

describe('xxhash-hash / transform', () => {
  it('按选项产出哈希', async () => {
    await expect(transform({ text: 'hello' }, h32)).resolves.toBe(HELLO_32)
  })

  it('空输入返回空串（不会去加载 WASM）', async () => {
    await expect(transform({ text: '' }, h32)).resolves.toBe('')
  })
})
