import { describe, expect, it } from 'vitest'
import { digest, toBase64, toHex, transform } from './utils'

const base = { uppercase: false, format: 'hex' } as const

describe('sha1-hash / 编码辅助', () => {
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

describe('sha1-hash / digest', () => {
  it('SHA-1("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'hex', false)).resolves.toBe(
      'a9993e364706816aba3e25717850c26c9cd0d89d',
    )
  })

  it('SHA-1("") 的空串摘要有确定值', async () => {
    await expect(digest('', 'hex', false)).resolves.toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })

  it('SHA-1(448 位长消息) 与公开标准向量一致', async () => {
    await expect(
      digest('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', 'hex', false),
    ).resolves.toBe('84983e441c3bd26ebaae4aa1f95129e5e54670f1')
  })

  it('SHA-1("abc") 的 Base64 输出与标准向量一致', async () => {
    await expect(digest('abc', 'base64', false)).resolves.toBe('qZk+NkcGgWq6PiVxeFDCbJzQ2J0=')
  })

  it('大写输出只影响 hex，长度固定为 40', async () => {
    const out = await digest('abc', 'hex', true)
    expect(out).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
    expect(out).toHaveLength(40)
  })

  it('UTF-8 编码：中文按字节参与计算', async () => {
    const out = await digest('中文', 'hex', false)
    expect(out).toHaveLength(40)
    expect(out).toMatch(/^[0-9a-f]{40}$/)
  })
})

describe('sha1-hash / transform', () => {
  it('空输入返回空串（边界）', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })

  it('按选项选择输出格式', async () => {
    await expect(transform({ text: 'abc' }, { uppercase: false, format: 'base64' })).resolves.toBe(
      'qZk+NkcGgWq6PiVxeFDCbJzQ2J0=',
    )
  })

  it('相同输入得到相同摘要（确定性）', async () => {
    const [a, b] = await Promise.all([
      transform({ text: 'hello' }, base),
      transform({ text: 'hello' }, base),
    ])
    expect(a).toBe(b)
    expect(a).toHaveLength(40)
  })
})
