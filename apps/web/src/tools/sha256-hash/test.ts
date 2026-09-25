import { describe, expect, it } from 'vitest'
import { ALGORITHMS, digest, toBase64, toHex, transform } from './utils'

const base = { algorithm: 'SHA-256', format: 'hex' } as const

describe('sha256-hash / 编码辅助', () => {
  it('逐字节转两位小写十六进制', () => {
    expect(toHex(Uint8Array.from([0x00, 0x0f, 0xff]))).toBe('000fff')
  })

  it('Base64 编码正确处理 3 / 2 / 1 三种尾部长度', () => {
    const encoder = new TextEncoder()
    expect(toBase64(encoder.encode('abc'))).toBe('YWJj')
    expect(toBase64(encoder.encode('ab'))).toBe('YWI=')
    expect(toBase64(encoder.encode('a'))).toBe('YQ==')
  })
})

describe('sha256-hash / digest', () => {
  it('SHA-256("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'SHA-256', 'hex')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('SHA-256("") 的空串摘要有确定值', async () => {
    await expect(digest('', 'SHA-256', 'hex')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('SHA-384("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'SHA-384', 'hex')).resolves.toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    )
  })

  it('SHA-512("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'SHA-512', 'hex')).resolves.toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    )
  })

  it('SHA-256("abc") 的 Base64 输出与标准向量一致', async () => {
    await expect(digest('abc', 'SHA-256', 'base64')).resolves.toBe(
      'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=',
    )
  })

  it('三种算法的十六进制长度分别为 64 / 96 / 128', async () => {
    const lengths = await Promise.all(
      ALGORITHMS.map(async (algorithm) => (await digest('abc', algorithm, 'hex')).length),
    )
    expect(lengths).toEqual([64, 96, 128])
  })
})

describe('sha256-hash / transform', () => {
  it('空输入返回空串（边界）', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })

  it('按选项选算法', async () => {
    await expect(transform({ text: 'abc' }, { ...base, algorithm: 'SHA-384' })).resolves.toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    )
  })

  it('按选项选输出格式', async () => {
    await expect(transform({ text: 'abc' }, { ...base, format: 'base64' })).resolves.toBe(
      'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=',
    )
  })
})
