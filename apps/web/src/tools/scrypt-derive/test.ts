import { describe, expect, it } from 'vitest'
import { scrypt, toBase64, toHex, transform } from './utils'

const base = { blocks: '1024', parallelism: '1', length: '32', format: 'hex' } as const

describe('scrypt-derive / RFC 7914 标准向量', () => {
  it('向量 1：scrypt("", "", N=16, r=1, p=1, dkLen=64)', async () => {
    expect(toHex(await scrypt('', '', 16, 1, 1, 64))).toBe(
      '77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906',
    )
  })

  it('向量 2：scrypt("password", "NaCl", N=1024, r=8, p=16, dkLen=64)', async () => {
    expect(toHex(await scrypt('password', 'NaCl', 1024, 8, 16, 64))).toBe(
      'fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b3731622eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640',
    )
  })

  it('向量 3：scrypt("pleaseletmein", "SodiumChloride", N=16384, r=8, p=1, dkLen=64)', async () => {
    expect(toHex(await scrypt('pleaseletmein', 'SodiumChloride', 16384, 8, 1, 64))).toBe(
      '7023bdcb3afd7348461c06cd81fd38ebfda8fbba904f8e3ea9b543f6545da1f2d5432955613f0fcf62d49705242a9af9e61e85dc0d651e40dfcf017b45575887',
    )
  })

  it('dkLen 变短时结果是长结果的严格前缀（PBKDF2 输出块按序生成）', async () => {
    const long = toHex(await scrypt('', '', 16, 1, 1, 64))
    const short = toHex(await scrypt('', '', 16, 1, 1, 32))
    expect(short).toBe(long.slice(0, 64))
    expect(short).toHaveLength(64)
  })
})

describe('scrypt-derive / transform 与选项', () => {
  it('默认参数（N=1024 / p=1 / 32 字节）输出 64 位十六进制', async () => {
    const out = await transform({ text: 'password', salt: 'NaCl' }, base)
    expect(out).toMatch(/^[0-9a-f]{64}$/)
  })

  it('同一输入多次派生结果一致（确定性）', async () => {
    const first = await transform({ text: 'password', salt: 'NaCl' }, base)
    const second = await transform({ text: 'password', salt: 'NaCl' }, base)
    expect(second).toBe(first)
  })

  it('base64 输出就是 hex 结果字节的 base64', async () => {
    const hex = await transform({ text: 'password', salt: 'NaCl' }, base)
    const b64 = await transform({ text: 'password', salt: 'NaCl' }, { ...base, format: 'base64' })
    expect(b64).toBe(toBase64(Buffer.from(hex, 'hex')))
  })

  it('dkLen=64 输出 128 位十六进制', async () => {
    const out = await transform({ text: 'password', salt: 'NaCl' }, { ...base, length: '64' })
    expect(out).toHaveLength(128)
  })

  it('N 变化会改变派生结果', async () => {
    const small = await transform({ text: 'password', salt: 'NaCl' }, base)
    const large = await transform(
      { text: 'password', salt: 'NaCl' },
      {
        ...base,
        blocks: '16384',
      },
    )
    expect(large).not.toBe(small)
  })

  it('p 变化会改变派生结果', async () => {
    const one = await transform({ text: 'password', salt: 'NaCl' }, base)
    const two = await transform(
      { text: 'password', salt: 'NaCl' },
      {
        ...base,
        parallelism: '2',
      },
    )
    expect(two).not.toBe(one)
  })

  it('盐不同结果不同', async () => {
    const saltA = await transform({ text: 'password', salt: 'NaCl' }, base)
    const saltB = await transform({ text: 'password', salt: 'NaCl2' }, base)
    expect(saltB).not.toBe(saltA)
  })
})

describe('scrypt-derive / 边界与参数校验', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '', salt: 'NaCl' }, base)).resolves.toBe('')
  })

  it('空盐也能派生（输出长度仍符合选项）', async () => {
    const out = await transform({ text: 'password', salt: '' }, base)
    expect(out).toHaveLength(64)
  })

  it('N 不是 2 的幂时报错', async () => {
    await expect(scrypt('password', 'NaCl', 1000, 8, 1, 32)).rejects.toThrow(/2 的幂/)
  })

  it('p / r 不是正整数时报错', async () => {
    await expect(scrypt('password', 'NaCl', 16, 1, 0, 32)).rejects.toThrow(/p 必须/)
    await expect(scrypt('password', 'NaCl', 16, 0, 1, 32)).rejects.toThrow(/r 必须/)
  })

  it('超过 200,000 字符上限时报错', async () => {
    await expect(transform({ text: 'a'.repeat(200001), salt: 'NaCl' }, base)).rejects.toThrow(
      /200,000/,
    )
  })
})
