import { describe, expect, it } from 'vitest'
import { decryptBytes, encryptBytes, fromHex, toBase64, toHex, transform } from './utils'
import type { DesOptions } from './schema'

const DES_KEY = '0011223344556677'
const TRIPLE_DES_KEY = '00112233445566778899aabbccddeeff0011223344556677'
const IV_HEX = '8899aabbccddeeff'

const encHex = {
  method: 'des',
  mode: 'CBC',
  direction: 'encrypt',
  encoding: 'hex',
  padding: 'pkcs7',
} as const
const decHex = { ...encHex, direction: 'decrypt' } as const

describe('des-encrypt / 标准已知向量', () => {
  it('DES-ECB 单块向量 133457799BBCDFF1 → 85e813540f0ab405', () => {
    const cipherBytes = encryptBytes(
      fromHex('0123456789abcdef'),
      fromHex('133457799BBCDFF1'),
      null,
      { method: 'des', mode: 'ECB', padding: 'none' },
    )
    expect(toHex(cipherBytes)).toBe('85e813540f0ab405')
  })

  it('同一向量可逆（解密还原明文块）', () => {
    const plainBytes = decryptBytes(
      fromHex('85e813540f0ab405'),
      fromHex('133457799BBCDFF1'),
      null,
      { method: 'des', mode: 'ECB', padding: 'none' },
    )
    expect(toHex(plainBytes)).toBe('0123456789abcdef')
  })
})

describe('des-encrypt / 加密解密往返', () => {
  it('DES-CBC + PKCS#7 文本往返', () => {
    const text = 'Hello 世界 🚀'
    const cipher = transform({ text, key: DES_KEY, iv: IV_HEX }, encHex)
    expect(transform({ text: cipher, key: DES_KEY, iv: IV_HEX }, decHex)).toBe(text)
  })

  it('3DES-CBC + PKCS#7 文本往返', () => {
    const text = 'legacy 系统兼容'
    const cipher = transform(
      { text, key: TRIPLE_DES_KEY, iv: IV_HEX },
      { ...encHex, method: '3des' },
    )
    expect(
      transform({ text: cipher, key: TRIPLE_DES_KEY, iv: IV_HEX }, { ...decHex, method: '3des' }),
    ).toBe(text)
  })

  it('DES-ECB 无填充往返（块对齐输入）', () => {
    const plain = fromHex('000102030405060708090a0b0c0d0e0f')
    const cipher = encryptBytes(plain, fromHex('133457799BBCDFF1'), null, {
      method: 'des',
      mode: 'ECB',
      padding: 'none',
    })
    const back = decryptBytes(cipher, fromHex('133457799BBCDFF1'), null, {
      method: 'des',
      mode: 'ECB',
      padding: 'none',
    })
    expect(toHex(back)).toBe('000102030405060708090a0b0c0d0e0f')
  })

  it('3DES 与 DES 对同一明文产出不同密文', () => {
    const options = { mode: 'ECB', padding: 'none' } as const
    const plain = fromHex('0123456789abcdef')
    const des = encryptBytes(plain, fromHex(DES_KEY), null, { ...options, method: 'des' })
    const triple = encryptBytes(plain, fromHex(TRIPLE_DES_KEY), null, {
      ...options,
      method: '3des',
    })
    expect(toHex(triple)).not.toBe(toHex(des))
  })
})

describe('des-encrypt / 输出格式', () => {
  it('CBC 输出为 `<iv(base64)>.<密文(base64)>`', () => {
    const out = transform({ text: 'abc', key: DES_KEY, iv: IV_HEX }, encHex)
    expect(out).toMatch(/^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/)
    // 前缀正是 IV 的 base64
    expect(out.split('.')[0]).toBe(toBase64(fromHex(IV_HEX)))
  })

  it('ECB 只输出一段密文，不带 IV 前缀', () => {
    const out = transform({ text: 'abc', key: DES_KEY, iv: '' }, { ...encHex, mode: 'ECB' })
    expect(out).not.toContain('.')
    expect(out).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('hex 与 base64 两种密钥编码等价', () => {
    const asBase64 = toBase64(fromHex(DES_KEY))
    const fromHexKey = transform({ text: 'abc', key: DES_KEY, iv: IV_HEX }, encHex)
    const fromBase64Key = transform(
      { text: 'abc', key: asBase64, iv: toBase64(fromHex(IV_HEX)) },
      { ...encHex, encoding: 'base64' },
    )
    expect(fromBase64Key).toBe(fromHexKey)
  })
})

describe('des-encrypt / 约束与错误', () => {
  it('CBC 缺少 IV 时报错', () => {
    expect(() => transform({ text: 'abc', key: DES_KEY, iv: '' }, encHex)).toThrow(/IV/)
  })

  it('DES 密钥长度不是 8 字节时报错', () => {
    // 16 字节（hex 32 字符）对 DES 来说过长
    expect(() =>
      transform({ text: 'abc', key: '0123456789abcdef0123456789abcdef', iv: IV_HEX }, encHex),
    ).toThrow(/8 字节密钥/)
  })

  it('3DES 密钥长度不是 24 字节时报错', () => {
    expect(() =>
      transform({ text: 'abc', key: DES_KEY, iv: IV_HEX }, { ...encHex, method: '3des' }),
    ).toThrow(/24 字节密钥/)
  })

  it('密钥为空时报错', () => {
    expect(() => transform({ text: 'abc', key: '', iv: IV_HEX }, encHex)).toThrow(/密钥/)
  })

  it('CBC 解密时密文缺少 `<iv>.` 前缀会报错', () => {
    expect(() => transform({ text: '@@@@', key: DES_KEY, iv: IV_HEX }, decHex)).toThrow(
      /base64|格式/,
    )
  })

  it('用错密钥解密不会还原出原文', () => {
    const cipher = transform({ text: 'secret', key: DES_KEY, iv: IV_HEX }, encHex)
    let out: string
    try {
      out = transform({ text: cipher, key: '76543210fedcba98', iv: IV_HEX }, decHex)
    } catch {
      out = '<错误>'
    }
    expect(out).not.toBe('secret')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '', key: DES_KEY, iv: IV_HEX }, encHex)).toBe('')
    expect(transform({ text: '', key: DES_KEY, iv: IV_HEX }, decHex)).toBe('')
  })
})

describe('des-encrypt / ECB 弱点演示', () => {
  it('ECB 下相同明文块产出相同密文块', () => {
    const keyBytes = fromHex('133457799BBCDFF1')
    const plain = fromHex('00000000000000000000000000000000')
    const cipher = encryptBytes(plain, keyBytes, null, {
      method: 'des',
      mode: 'ECB',
      padding: 'none',
    })
    const block1 = toHex(cipher.subarray(0, 8))
    const block2 = toHex(cipher.subarray(8, 16))
    expect(block1).toBe(block2)
  })
})

describe('des-encrypt / 默认选项可用性', () => {
  it('默认参数（des/CBC/pkcs7）能直接跑通示例', () => {
    const options: DesOptions = {
      method: 'des',
      mode: 'CBC',
      direction: 'encrypt',
      encoding: 'utf8',
      padding: 'pkcs7',
    }
    const cipher = transform({ text: '示例明文', key: 'deskey01', iv: 'ivvector' }, options)
    expect(
      transform(
        { text: cipher, key: 'deskey01', iv: 'ivvector' },
        { ...options, direction: 'decrypt' },
      ),
    ).toBe('示例明文')
  })
})
