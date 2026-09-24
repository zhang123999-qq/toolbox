import { describe, expect, it } from 'vitest'
import { ALGORITHMS, digest, toHex, transform } from './utils'

describe('text-hash / toHex', () => {
  it('逐字节转两位十六进制', () => {
    expect(toHex(Uint8Array.from([0x00, 0x0f, 0xff]))).toBe('000fff')
  })
})

describe('text-hash / digest', () => {
  it('SHA-256 结果与已知值一致', async () => {
    await expect(digest('abc', 'SHA-256', false)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('空串也有确定摘要', async () => {
    await expect(digest('', 'SHA-256', false)).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('大写输出', async () => {
    const out = await digest('abc', 'SHA-256', true)
    expect(out).toBe(out.toUpperCase())
  })

  it('四种算法长度不同', async () => {
    const lengths = await Promise.all(
      ALGORITHMS.map(async (algo) => (await digest('abc', algo, false)).length),
    )
    expect(lengths).toEqual([40, 64, 96, 128])
  })

  it('UTF-8 编码：中文也能算', async () => {
    await expect(digest('中文', 'SHA-256', false)).resolves.toHaveLength(64)
  })
})

describe('text-hash / transform', () => {
  const base = { algorithm: 'SHA-256', uppercase: false } as const

  it('空输入返回空串', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })

  it('按选项选算法', async () => {
    await expect(transform({ text: 'abc' }, { ...base, algorithm: 'SHA-1' })).resolves.toBe(
      'a9993e364706816aba3e25717850c26c9cd0d89d',
    )
  })
})
