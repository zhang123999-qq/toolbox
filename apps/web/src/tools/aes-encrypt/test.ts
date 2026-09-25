import { describe, expect, it } from 'vitest'
import {
  decryptBytes,
  encryptBytes,
  fromBase64,
  fromHex,
  ivBytesFor,
  toBase64,
  toHex,
  transform,
} from './utils'

const KEY16_HEX = '000102030405060708090a0b0c0d0e0f'
const KEY16_ALT_HEX = '000102030405060708090a0b0c0d0e10'
const KEY192_HEX = '000102030405060708090a0b0c0d0e0f1011121314151617'
const KEY256_HEX = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
const GCM_IV_HEX = '000000000000000000000000'
const GCM_IV2_HEX = '010101010101010101010101'
const CBC_IV_HEX = '000102030405060708090a0b0c0d0e0f'

const gcmEnc = { method: 'GCM', bits: '128', direction: 'encrypt', encoding: 'hex' } as const
const gcmDec = { ...gcmEnc, direction: 'decrypt' } as const
const cbcEnc = { method: 'CBC', bits: '128', direction: 'encrypt', encoding: 'hex' } as const
const cbcDec = { ...cbcEnc, direction: 'decrypt' } as const

const TEXT = '这是一段需要加密的明文。'

describe('aes-encrypt / 标准已知向量', () => {
  it('AES-128-GCM 全零向量（NIST SP 800-38A 派生）', async () => {
    const cipher = await encryptBytes(
      fromHex('00000000000000000000000000000000'),
      fromHex('00000000000000000000000000000000'),
      'GCM',
      fromHex('000000000000000000000000'),
    )
    expect(toHex(cipher)).toBe('0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf')
  })

  it('AES-128-GCM 向量可逆', async () => {
    const plain = await decryptBytes(
      fromHex('0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf'),
      fromHex('00000000000000000000000000000000'),
      'GCM',
      fromHex('000000000000000000000000'),
    )
    expect(toHex(plain)).toBe('00000000000000000000000000000000')
  })

  it('AES-128-CBC 已知向量（含 PKCS#7 填充块）', async () => {
    const cipher = await encryptBytes(
      fromHex('6bc1bee22e409f96e93d7e117393172a'),
      fromHex('2b7e151628aed2a6abf7158809cf4f3c'),
      'CBC',
      fromHex('000102030405060708090a0b0c0d0e0f'),
    )
    expect(toHex(cipher)).toBe('7649abac8119b246cee98e9b12e9197d8964e0b149c10b7b682e6e39aaeb731c')
  })
})

describe('aes-encrypt / AES-GCM 往返与完整性', () => {
  it('固定 IV 下加密后可原样解密', async () => {
    const cipher = await transform({ text: TEXT, key: KEY16_HEX, iv: GCM_IV_HEX }, gcmEnc)
    await expect(transform({ text: cipher, key: KEY16_HEX, iv: GCM_IV_HEX }, gcmDec)).resolves.toBe(
      TEXT,
    )
  })

  it('IV 留空时自动生成随机 IV，两次密文不同且都能解密', async () => {
    const first = await transform({ text: 'hi', key: KEY16_HEX, iv: '' }, gcmEnc)
    const second = await transform({ text: 'hi', key: KEY16_HEX, iv: '' }, gcmEnc)
    expect(first).not.toBe(second)
    await expect(transform({ text: first, key: KEY16_HEX, iv: '' }, gcmDec)).resolves.toBe('hi')
    await expect(transform({ text: second, key: KEY16_HEX, iv: '' }, gcmDec)).resolves.toBe('hi')
  })

  it('输出格式为 `<iv(base64)>.<密文(base64)>`，IV 前缀即填入的 IV', async () => {
    const out = await transform({ text: 'hello', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmEnc)
    const parts = out.split('.')
    expect(parts).toHaveLength(2)
    expect(parts[0]).toBe(toBase64(fromHex(GCM_IV_HEX)))
    expect(ivBytesFor('GCM')).toBe(12)
    expect(ivBytesFor('CBC')).toBe(16)
  })

  it('GCM 密文长度 = 明文长度 + 16 字节认证标签', async () => {
    const out = await transform({ text: 'hello', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmEnc)
    const cipherBytes = fromBase64(out.split('.')[1])
    expect(cipherBytes.length).toBe('hello'.length + 16)
  })

  it('篡改密文后解密失败（GCM 自带完整性校验）', async () => {
    const out = await transform({ text: 'hello', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmEnc)
    const [iv, body] = out.split('.')
    const bytes = fromBase64(body)
    bytes[0] ^= 0x01
    const tampered = `${iv}.${toBase64(bytes)}`
    await expect(
      transform({ text: tampered, key: KEY16_HEX, iv: GCM_IV_HEX }, gcmDec),
    ).rejects.toThrow(/解密失败/)
  })

  it('换一把密钥解密失败', async () => {
    const out = await transform({ text: 'hello', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmEnc)
    await expect(
      transform({ text: out, key: KEY16_ALT_HEX, iv: GCM_IV_HEX }, gcmDec),
    ).rejects.toThrow(/解密失败/)
  })
})

describe('aes-encrypt / AES-CBC 往返与约束', () => {
  it('CBC 固定 IV 下加密后可原样解密', async () => {
    const cipher = await transform({ text: TEXT, key: KEY16_HEX, iv: CBC_IV_HEX }, cbcEnc)
    await expect(transform({ text: cipher, key: KEY16_HEX, iv: CBC_IV_HEX }, cbcDec)).resolves.toBe(
      TEXT,
    )
  })

  it('CBC 缺少 IV 时报错', async () => {
    await expect(transform({ text: 'abc', key: KEY16_HEX, iv: '' }, cbcEnc)).rejects.toThrow(/IV/)
  })

  it('CBC 密文被改动不会报错但也不还原原文（无完整性校验）', async () => {
    const out = await transform({ text: TEXT, key: KEY16_HEX, iv: CBC_IV_HEX }, cbcEnc)
    const [iv, body] = out.split('.')
    const bytes = fromBase64(body)
    bytes[0] ^= 0xff
    let result: string
    try {
      result = await transform(
        { text: `${iv}.${toBase64(bytes)}`, key: KEY16_HEX, iv: CBC_IV_HEX },
        cbcDec,
      )
    } catch {
      result = '<错误>'
    }
    expect(result).not.toBe(TEXT)
  })
})

describe('aes-encrypt / 密钥与格式校验', () => {
  it('密钥长度与 bits 不符时报错', async () => {
    await expect(
      transform({ text: 'x', key: KEY16_HEX, iv: GCM_IV_HEX }, { ...gcmEnc, bits: '256' }),
    ).rejects.toThrow(/32 字节密钥/)
  })

  it('AES-192 与 AES-256 都能往返', async () => {
    const cases = [
      ['192', KEY192_HEX, 24],
      ['256', KEY256_HEX, 32],
    ] as const
    for (const [bits, key, size] of cases) {
      expect(fromHex(key).length).toBe(size)
      const options = { ...gcmEnc, bits }
      const cipher = await transform({ text: 'roundtrip', key, iv: GCM_IV2_HEX }, options)
      await expect(
        transform({ text: cipher, key, iv: GCM_IV2_HEX }, { ...options, direction: 'decrypt' }),
      ).resolves.toBe('roundtrip')
    }
  })

  it('密文格式非法（缺少 `.` 分隔）时报错', async () => {
    await expect(
      transform({ text: 'not-a-packet', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmDec),
    ).rejects.toThrow(/格式/)
  })

  it('hex 与 base64 两种密钥编码等价', async () => {
    const hexOut = await transform({ text: 'abc', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmEnc)
    const base64Out = await transform(
      { text: 'abc', key: toBase64(fromHex(KEY16_HEX)), iv: toBase64(fromHex(GCM_IV_HEX)) },
      { ...gcmEnc, encoding: 'base64' },
    )
    expect(base64Out).toBe(hexOut)
  })

  it('密钥为空时报错', async () => {
    await expect(transform({ text: 'abc', key: '', iv: GCM_IV_HEX }, gcmEnc)).rejects.toThrow(
      /密钥/,
    )
  })

  it('空输入返回空串（边界）', async () => {
    await expect(transform({ text: '', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmEnc)).resolves.toBe('')
    await expect(transform({ text: '', key: KEY16_HEX, iv: GCM_IV_HEX }, gcmDec)).resolves.toBe('')
  })
})
