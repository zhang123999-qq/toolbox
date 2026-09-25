import { describe, expect, it } from 'vitest'
import { LENGTHS, hashBlake3, parseLength, toHex, transform } from './utils'

const base = { length: '32', uppercase: false } as const
const upper = { ...base, uppercase: true } as const
const long = { ...base, length: '64' } as const

/** BLAKE3 官方测试向量：空串与 "hello" 的 32 字节摘要 */
const HELLO_32 = 'ea8f163db38682925e4491c5e58d4bb3506ef8c14eb78a86e908c5624a67200f'

describe('blake3-hash / 工具函数', () => {
  it('字节转十六进制，大小写可选', () => {
    expect(toHex(Uint8Array.from([0x0a, 0xff]), false)).toBe('0aff')
    expect(toHex(Uint8Array.from([0x0a, 0xff]), true)).toBe('0AFF')
  })

  it('长度取值受白名单约束', () => {
    expect(parseLength('64')).toBe(64)
    expect(() => parseLength('16')).toThrow(/不支持的输出长度/)
    expect(LENGTHS).toEqual(['32', '64'])
  })
})

describe('blake3-hash / 摘要', () => {
  it('"hello" 的 32 字节摘要与官方向量一致', async () => {
    await expect(hashBlake3('hello', base)).resolves.toBe(HELLO_32)
  })

  it('64 字节是同一摘要的延长输出（XOF 前缀相同）', async () => {
    const longDigest = await hashBlake3('hello', long)
    expect(longDigest.length).toBe(128)
    expect(longDigest.startsWith(HELLO_32)).toBe(true)
  })

  it('大写输出只是大小写不同', async () => {
    expect(await hashBlake3('hello', upper)).toBe(HELLO_32.toUpperCase())
  })

  it('输入变化则摘要变化', async () => {
    expect(await hashBlake3('hello!', base)).not.toBe(HELLO_32)
  })
})

describe('blake3-hash / transform', () => {
  it('按选项产出摘要', async () => {
    await expect(transform({ text: 'hello' }, base)).resolves.toBe(HELLO_32)
  })

  it('空输入返回空串（不会去加载 WASM）', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })
})
