import { afterEach, describe, expect, it, vi } from 'vitest'
import { ALGORITHMS, digest, sha3Digest, toBase64, toHex, transform } from './utils'

const encoder = new TextEncoder()
const base = { algorithm: 'SHA3-256', format: 'hex' } as const

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sha3-hash / 编码辅助', () => {
  it('逐字节转两位小写十六进制', () => {
    expect(toHex(Uint8Array.from([0x00, 0x0f, 0xff]))).toBe('000fff')
  })

  it('Base64 编码正确处理 3 / 2 / 1 三种尾部长度', () => {
    expect(toBase64(encoder.encode('abc'))).toBe('YWJj')
    expect(toBase64(encoder.encode('ab'))).toBe('YWI=')
    expect(toBase64(encoder.encode('a'))).toBe('YQ==')
  })
})

describe('sha3-hash / 内置 Keccak 实现（FIPS 202 标准向量）', () => {
  it('SHA3-256("abc") 与标准向量一致', () => {
    expect(toHex(sha3Digest(encoder.encode('abc'), 32))).toBe(
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    )
  })

  it('SHA3-384("abc") 与标准向量一致', () => {
    expect(toHex(sha3Digest(encoder.encode('abc'), 48))).toBe(
      'ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25',
    )
  })

  it('SHA3-512("abc") 与标准向量一致', () => {
    expect(toHex(sha3Digest(encoder.encode('abc'), 64))).toBe(
      'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
    )
  })

  it('SHA3-256("") 空串标准向量一致', () => {
    expect(toHex(sha3Digest(encoder.encode(''), 32))).toBe(
      'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
    )
  })

  it('跨速率块边界的长输入仍与标准向量一致（多块吸收与填充）', () => {
    // 136 字节是 SHA3-256 的速率：刻意取 135 / 136 / 137 与 272（两块整）验证 pad10*1 与多块吸收
    expect(toHex(sha3Digest(new Uint8Array(135).fill(0x61), 32))).toBe(
      '8094bb53c44cfb1e67b7c30447f9a1c33696d2463ecc1d9c92538913392843c9',
    )
    expect(toHex(sha3Digest(new Uint8Array(136).fill(0x61), 32))).toBe(
      '3fc5559f14db8e453a0a3091edbd2bc25e11528d81c66fa570a4efdcc2695ee1',
    )
    expect(toHex(sha3Digest(new Uint8Array(137).fill(0x61), 32))).toBe(
      'f8d6846cedd2ccfadf15c5879ef95af724d799eed7391fb1c91f95344e738614',
    )
    expect(toHex(sha3Digest(new Uint8Array(272).fill(0x61), 32))).toBe(
      'a490357b9b3fb39d0a89a117734e5b020b1f33c7bf3fa3575c396425432003d3',
    )
  })
})

describe('sha3-hash / digest（优先原生，回落内置）', () => {
  it('SHA3-256("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'SHA3-256', 'hex')).resolves.toBe(
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    )
  })

  it('SHA3-384("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'SHA3-384', 'hex')).resolves.toBe(
      'ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25',
    )
  })

  it('SHA3-512("abc") 与公开标准向量一致', async () => {
    await expect(digest('abc', 'SHA3-512', 'hex')).resolves.toBe(
      'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
    )
  })

  it('SHA3-256("abc") 的 Base64 输出与标准向量一致', async () => {
    await expect(digest('abc', 'SHA3-256', 'base64')).resolves.toBe(
      'Ophdp0/iJbIEXBcta9OQvYVfCG4+nVJbRr/iRRFDFTI=',
    )
  })

  it('三种算法的十六进制长度分别为 64 / 96 / 128', async () => {
    const lengths = await Promise.all(
      ALGORITHMS.map(async (algorithm) => (await digest('abc', algorithm, 'hex')).length),
    )
    expect(lengths).toEqual([64, 96, 128])
  })

  it('原生实现不可用时回落到内置实现，且结果与原生一致', async () => {
    // 模拟「浏览器不识别 SHA3-*」：原生调用抛错后必须走内置 Keccak，结果仍是标准向量
    vi.stubGlobal('crypto', {
      subtle: {
        digest: async () => {
          throw new Error('Unrecognized algorithm name')
        },
      },
    })
    await expect(digest('abc', 'SHA3-256', 'hex')).resolves.toBe(
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    )
    await expect(digest('abc', 'SHA3-384', 'hex')).resolves.toBe(
      'ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25',
    )
    await expect(digest('abc', 'SHA3-512', 'hex')).resolves.toBe(
      'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
    )
  })

  it('环境完全没有 WebCrypto 时也回落到内置实现', async () => {
    vi.stubGlobal('crypto', undefined)
    await expect(digest('abc', 'SHA3-256', 'hex')).resolves.toBe(
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    )
  })
})

describe('sha3-hash / transform', () => {
  it('空输入返回空串（边界）', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })

  it('按选项选算法与格式', async () => {
    await expect(
      transform({ text: 'abc' }, { algorithm: 'SHA3-384', format: 'hex' }),
    ).resolves.toBe(
      'ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25',
    )
    await expect(
      transform({ text: 'abc' }, { algorithm: 'SHA3-256', format: 'base64' }),
    ).resolves.toBe('Ophdp0/iJbIEXBcta9OQvYVfCG4+nVJbRr/iRRFDFTI=')
  })
})
