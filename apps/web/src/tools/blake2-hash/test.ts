import { describe, expect, it } from 'vitest'
import {
  ALGORITHMS,
  VARIANTS,
  blake2b,
  blake2s,
  digest,
  hash,
  toBase64,
  toHex,
  transform,
} from './utils'

const encoder = new TextEncoder()
const base = { algorithm: 'BLAKE2b-512', format: 'hex' } as const

describe('blake2-hash / 编码辅助', () => {
  it('逐字节转两位小写十六进制', () => {
    expect(toHex(Uint8Array.from([0x00, 0x0f, 0xff]))).toBe('000fff')
  })

  it('Base64 编码正确处理 3 / 2 / 1 三种尾部长度', () => {
    expect(toBase64(encoder.encode('abc'))).toBe('YWJj')
    expect(toBase64(encoder.encode('ab'))).toBe('YWI=')
    expect(toBase64(encoder.encode('a'))).toBe('YQ==')
  })
})

describe('blake2-hash / 内置实现的 RFC 7693 标准向量', () => {
  it('BLAKE2b-512("abc") 与标准向量一致', () => {
    expect(toHex(blake2b(encoder.encode('abc'), 64))).toBe(
      'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    )
  })

  it('BLAKE2s-256("abc") 与标准向量一致', () => {
    expect(toHex(blake2s(encoder.encode('abc'), 32))).toBe(
      '508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982',
    )
  })

  it('BLAKE2b-512("") 空串标准向量一致', () => {
    expect(toHex(blake2b(encoder.encode(''), 64))).toBe(
      '786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce',
    )
  })

  it('BLAKE2s-256("") 空串标准向量一致', () => {
    expect(toHex(blake2s(encoder.encode(''), 32))).toBe(
      '69217a3079908094e11121d042354a7c1f55b6482ca1a51e1b250dfd1ed0eef9',
    )
  })

  it('截断变体（BLAKE2b-384 / BLAKE2b-256 / BLAKE2s-128）与标准向量一致', () => {
    expect(toHex(blake2b(encoder.encode('abc'), 48))).toBe(
      '6f56a82c8e7ef526dfe182eb5212f7db9df1317e57815dbda46083fc30f54ee6c66ba83be64b302d7cba6ce15bb556f4',
    )
    expect(toHex(blake2b(encoder.encode('abc'), 32))).toBe(
      'bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319',
    )
    expect(toHex(blake2s(encoder.encode('abc'), 16))).toBe('aa4938119b1dc7b87cbad0ffd200d0ae')
    expect(toHex(blake2s(encoder.encode(''), 16))).toBe('64550d6ffe2c0a01a14aba1eade0200c')
  })

  it('跨块边界的长输入仍与标准向量一致（整块即最终块的边界）', () => {
    // 128 字节正好是 BLAKE2b 的块大小、64 字节是 BLAKE2s 的块大小：
    // 这条用例专门覆盖「长度是块大小整数倍时，最后一块也必须按最终块压缩」的处理
    expect(toHex(blake2b(new Uint8Array(128).fill(0), 64))).toBe(
      '865939e120e6805438478841afb739ae4250cf372653078a065cdcfffca4caf798e6d462b65d658fc165782640eded70963449ae1500fb0f24981d7727e22c41',
    )
    expect(toHex(blake2b(new Uint8Array(129).fill(0), 64))).toBe(
      'a60edba343e7a6933c14d203d2e535f35e6deb6c8a4f8e624c1a6f6e2612860447cb4c37e5aa11bcf03b7c3eea7228eb8b998f922794f2d1b8f2dc63f03bd3fa',
    )
    expect(toHex(blake2s(new Uint8Array(64).fill(0), 32))).toBe(
      'ae09db7cd54f42b490ef09b6bc541af688e4959bb8c53f359a6f56e38ab454a3',
    )
    expect(toHex(blake2s(new Uint8Array(65).fill(0), 32))).toBe(
      '857328bf990b00922782d3e81c6054c25d3375d386c7424abe3e01d79041046c',
    )
  })

  it('hash 按变体分派到对应家族与长度', () => {
    for (const algorithm of ALGORITHMS) {
      expect(hash(encoder.encode('abc'), algorithm)).toHaveLength(VARIANTS[algorithm].outBytes)
    }
  })
})

describe('blake2-hash / digest', () => {
  it('BLAKE2b-512("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'BLAKE2b-512', 'hex')).resolves.toBe(
      'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    )
  })

  it('BLAKE2s-256("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'BLAKE2s-256', 'hex')).resolves.toBe(
      '508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982',
    )
  })

  it('BLAKE2b-512("abc") 的 Base64 输出与标准向量一致', async () => {
    await expect(digest('abc', 'BLAKE2b-512', 'base64')).resolves.toBe(
      'uoClP5gcTQ1qJ5e2nxL26UwhLxRoWsS3SxK7b9v/otF9h8U5Kqt5LcJS1d5FM8yVGNOKqNvxklq5I4bt1ACZIw==',
    )
  })

  it('UTF-8 编码：中文也能算', async () => {
    const out = await digest('中文', 'BLAKE2b-512', 'hex')
    expect(out).toHaveLength(128)
    expect(out).toMatch(/^[0-9a-f]{128}$/)
  })
})

describe('blake2-hash / transform', () => {
  it('空输入返回空串（边界）', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })

  it('按选项选变体与格式', async () => {
    await expect(
      transform({ text: 'abc' }, { algorithm: 'BLAKE2s-256', format: 'hex' }),
    ).resolves.toBe('508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982')
    await expect(
      transform({ text: 'abc' }, { algorithm: 'BLAKE2b-256', format: 'hex' }),
    ).resolves.toBe('bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319')
  })

  it('相同输入得到相同摘要（确定性）', async () => {
    const [a, b] = await Promise.all([
      transform({ text: 'hello' }, base),
      transform({ text: 'hello' }, base),
    ])
    expect(a).toBe(b)
    expect(a).toHaveLength(128)
  })
})
