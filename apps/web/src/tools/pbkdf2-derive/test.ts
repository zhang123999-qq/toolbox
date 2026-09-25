import { describe, expect, it } from 'vitest'
import { deriveBits, fromHex, parseSalt, toBase64, toHex, transform } from './utils'

/** 标准向量的盐/口令都是 ASCII，按 UTF-8 编码即可 */
const utf8 = (text: string) => new TextEncoder().encode(text)
const SALT = utf8('salt')

const base = {
  algorithm: 'SHA-256',
  iterations: '1000',
  length: '32',
  encoding: 'utf8',
  format: 'hex',
} as const

describe('pbkdf2-derive / 标准已知向量', () => {
  it('RFC 6070：PBKDF2-HMAC-SHA1("password","salt",1,20)', async () => {
    expect(toHex(await deriveBits('password', SALT, 1, 'SHA-1', 20))).toBe(
      '0c60c80f961f0e71f3a9b524af6012062fe037a6',
    )
  })

  it('RFC 7914：PBKDF2-HMAC-SHA256("password","salt",1,32)', async () => {
    expect(toHex(await deriveBits('password', SALT, 1, 'SHA-256', 32))).toBe(
      '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
    )
  })

  it('RFC 7914：PBKDF2-HMAC-SHA256("password","salt",4096,32)', async () => {
    expect(toHex(await deriveBits('password', SALT, 4096, 'SHA-256', 32))).toBe(
      'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a',
    )
  })

  it('RFC 7914：PBKDF2-HMAC-SHA512("password","salt",1,64)', async () => {
    expect(toHex(await deriveBits('password', SALT, 1, 'SHA-512', 64))).toBe(
      '867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252c02d470a285a0501bad999bfe943c08f050235d7d68b1da55e63f73b60a57fce',
    )
  })

  it('同一输入多次派生结果一致（确定性）', async () => {
    const first = await deriveBits('password', SALT, 1, 'SHA-256', 32)
    const second = await deriveBits('password', SALT, 1, 'SHA-256', 32)
    expect(toHex(second)).toBe(toHex(first))
  })
})

describe('pbkdf2-derive / transform 与选项', () => {
  it('默认参数（SHA-256 / 1000 / 32 字节）与已知值一致', async () => {
    await expect(transform({ text: 'password', salt: 'salt' }, base)).resolves.toBe(
      '632c2812e46d4604102ba7618e9d6d7d2f8128f6266b4a03264d2a0460b7dcb3',
    )
  })

  it('输出长度随 length 选项变化（16/32/64 字节）', async () => {
    for (const [length, hexLength] of [
      ['16', 32],
      ['32', 64],
      ['64', 128],
    ] as const) {
      const out = await transform({ text: 'password', salt: 'salt' }, { ...base, length })
      expect(out).toHaveLength(hexLength)
    }
  })

  it('base64 输出就是 hex 结果字节的 base64', async () => {
    const hex = await transform({ text: 'password', salt: 'salt' }, base)
    const b64 = await transform({ text: 'password', salt: 'salt' }, { ...base, format: 'base64' })
    expect(b64).toBe(toBase64(fromHex(hex)))
  })

  it('hex 编码的盐（73616c74）等价于 utf8 的 "salt"', async () => {
    const viaUtf8 = await transform({ text: 'password', salt: 'salt' }, base)
    const viaHex = await transform(
      { text: 'password', salt: '73616c74' },
      {
        ...base,
        encoding: 'hex',
      },
    )
    expect(viaHex).toBe(viaUtf8)
  })

  it('换算法（SHA-1 / SHA-256）产出不同结果', async () => {
    const sha1 = await transform(
      { text: 'password', salt: 'salt' },
      { ...base, algorithm: 'SHA-1' },
    )
    const sha256 = await transform({ text: 'password', salt: 'salt' }, base)
    expect(sha1).not.toBe(sha256)
  })

  it('迭代次数越多结果越不同（1000 vs 10000）', async () => {
    const low = await transform({ text: 'password', salt: 'salt' }, base)
    const high = await transform(
      { text: 'password', salt: 'salt' },
      {
        ...base,
        iterations: '10000',
      },
    )
    expect(high).not.toBe(low)
  })

  it('parseSalt 对空串返回空字节，对 hex 按十六进制解析', () => {
    expect(parseSalt('', 'utf8')).toHaveLength(0)
    expect(toHex(parseSalt('73616c74', 'hex'))).toBe('73616c74')
  })
})

describe('pbkdf2-derive / 边界', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '', salt: 'salt' }, base)).resolves.toBe('')
  })

  it('空盐也能派生（输出长度仍符合选项）', async () => {
    const out = await transform({ text: 'password', salt: '' }, base)
    expect(out).toHaveLength(64)
  })

  it('超过 200,000 字符上限时报错', async () => {
    await expect(transform({ text: 'a'.repeat(200001), salt: 'salt' }, base)).rejects.toThrow(
      /200,000/,
    )
  })
})
