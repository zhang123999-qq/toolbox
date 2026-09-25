import { describe, expect, it } from 'vitest'
import { ALGORITHMS, hexToBytes, keyBytes, sign, toBase64, toHex, transform } from './utils'

const FOX = 'The quick brown fox jumps over the lazy dog'
const base = { algorithm: 'SHA-256', format: 'hex', type: 'text' } as const

describe('hmac-calc / 编码辅助', () => {
  it('逐字节转两位小写十六进制', () => {
    expect(toHex(Uint8Array.from([0x00, 0x0f, 0xff]))).toBe('000fff')
  })

  it('Base64 编码正确处理 3 / 2 / 1 三种尾部长度', () => {
    const encoder = new TextEncoder()
    expect(toBase64(encoder.encode('abc'))).toBe('YWJj')
    expect(toBase64(encoder.encode('ab'))).toBe('YWI=')
    expect(toBase64(encoder.encode('a'))).toBe('YQ==')
  })

  it('hexToBytes 忽略空白且大小写不敏感', () => {
    expect([...hexToBytes(' 6b 65  79 ')]).toEqual([0x6b, 0x65, 0x79])
    expect([...hexToBytes('6B6579')]).toEqual([0x6b, 0x65, 0x79])
  })

  it('hexToBytes 遇到奇数位或非法字符直接报错', () => {
    expect(() => hexToBytes('6b6')).toThrow(/偶数/)
    expect(() => hexToBytes('zz')).toThrow(/只能包含/)
  })

  it('keyBytes 按 type 决定文本还是十六进制字节', () => {
    expect([...keyBytes('key', 'text')]).toEqual([0x6b, 0x65, 0x79])
    expect([...keyBytes('6b6579', 'hex')]).toEqual([0x6b, 0x65, 0x79])
  })
})

describe('hmac-calc / sign（公开标准向量）', () => {
  it('HMAC-SHA256(key="key") 与 RFC 向量一致', async () => {
    await expect(sign(FOX, keyBytes('key', 'text'), 'SHA-256', 'hex')).resolves.toBe(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    )
  })

  it('HMAC-SHA1(key="key") 与标准向量一致', async () => {
    await expect(sign(FOX, keyBytes('key', 'text'), 'SHA-1', 'hex')).resolves.toBe(
      'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9',
    )
  })

  it('HMAC-SHA384(key="key") 与标准向量一致', async () => {
    await expect(sign(FOX, keyBytes('key', 'text'), 'SHA-384', 'hex')).resolves.toBe(
      'd7f4727e2c0b39ae0f1e40cc96f60242d5b7801841cea6fc592c5d3e1ae50700582a96cf35e1e554995fe4e03381c237',
    )
  })

  it('HMAC-SHA512(key="key") 与标准向量一致', async () => {
    await expect(sign(FOX, keyBytes('key', 'text'), 'SHA-512', 'hex')).resolves.toBe(
      'b42af09057bac1e2d41708e48a902e09b5ff7f12ab428a4fe86653c73dd248fb82f948a549f7b791a5b41915ee4d1ec3935357e4e2317250d0372afa2ebeeb3a',
    )
  })

  it('Base64 输出与标准向量一致', async () => {
    await expect(sign(FOX, keyBytes('key', 'text'), 'SHA-256', 'base64')).resolves.toBe(
      '97yD9DBThCSxMpjmqm+xQ+9NWaFJRhdZl0edvC0aPNg=',
    )
  })

  it('十六进制密钥 "6b6579" 与文本密钥 "key" 得到同一 HMAC', async () => {
    const textMac = await sign(FOX, keyBytes('key', 'text'), 'SHA-256', 'hex')
    const hexMac = await sign(FOX, keyBytes('6b6579', 'hex'), 'SHA-256', 'hex')
    expect(hexMac).toBe(textMac)
  })

  it('四种算法的十六进制长度分别为 40 / 64 / 96 / 128', async () => {
    const lengths = await Promise.all(
      ALGORITHMS.map(
        async (algorithm) => (await sign(FOX, keyBytes('key', 'text'), algorithm, 'hex')).length,
      ),
    )
    expect(lengths).toEqual([40, 64, 96, 128])
  })
})

describe('hmac-calc / transform', () => {
  it('空输入返回空串（边界）', async () => {
    await expect(transform({ text: '', key: 'key' }, base)).resolves.toBe('')
  })

  it('没填密钥时给出缺项提示', async () => {
    await expect(transform({ text: FOX, key: '' }, base)).rejects.toThrow(/请先填写密钥/)
  })

  it('十六进制模式下密钥不是合法十六进制时报错', async () => {
    await expect(
      transform({ text: FOX, key: 'zz' }, { algorithm: 'SHA-256', format: 'hex', type: 'hex' }),
    ).rejects.toThrow(/只能包含/)
  })

  it('按选项选算法与密钥写法', async () => {
    await expect(
      transform({ text: FOX, key: '6b6579' }, { algorithm: 'SHA-512', format: 'hex', type: 'hex' }),
    ).resolves.toBe(
      'b42af09057bac1e2d41708e48a902e09b5ff7f12ab428a4fe86653c73dd248fb82f948a549f7b791a5b41915ee4d1ec3935357e4e2317250d0372afa2ebeeb3a',
    )
    await expect(
      transform(
        { text: FOX, key: 'key' },
        { algorithm: 'SHA-256', format: 'base64', type: 'text' },
      ),
    ).resolves.toBe('97yD9DBThCSxMpjmqm+xQ+9NWaFJRhdZl0edvC0aPNg=')
  })

  it('相同消息与密钥得到相同结果（确定性）', async () => {
    const [a, b] = await Promise.all([
      transform({ text: FOX, key: 'key' }, base),
      transform({ text: FOX, key: 'key' }, base),
    ])
    expect(a).toBe(b)
    expect(a).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8')
  })
})
