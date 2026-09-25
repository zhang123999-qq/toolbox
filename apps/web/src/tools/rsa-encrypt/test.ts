import { describe, expect, it } from 'vitest'
import {
  DEMO_PRIVATE_KEY,
  DEMO_PUBLIC_KEY,
  decodeValue,
  decrypt,
  encrypt,
  pemToDer,
  sign,
  transform,
  verify,
} from './utils'

const base = { direction: 'sign', hash: 'SHA-256', encoding: 'base64' } as const
const enc = { ...base, direction: 'encrypt' } as const
const dec = { ...base, direction: 'decrypt' } as const
const ver = { ...base, direction: 'verify' } as const

const TEXT = '这是一段需要 RSA 签名的数据。'

/** 示例密钥 + 示例文本在 SHA-256 / PKCS#1 v1.5 下的签名（确定性，可硬断言） */
const KNOWN_SIGNATURE_PREFIX = 'HdUurE0L7y2qWPwayii8LbVzy0JNJype'

describe('rsa-encrypt / PEM 与编码', () => {
  it('PEM 去掉头尾后能还原出 DER 字节', () => {
    const der = pemToDer(DEMO_PUBLIC_KEY)
    // SPKI 的 RSA-2048 公钥固定 294 字节
    expect(der.length).toBe(294)
  })

  it('忽略 PEM 里的换行与空行', () => {
    const spaced = DEMO_PUBLIC_KEY.replace(/\n/g, '\n\n   ')
    expect(pemToDer(spaced).length).toBe(294)
  })

  it('密钥不是 PEM 时给出可读错误', () => {
    expect(() => pemToDer('not a key')).toThrow(/不是合法的 PEM/)
    expect(() => pemToDer('   ')).toThrow(/密钥为空/)
  })

  it('Base64 / 十六进制互转字节', () => {
    expect([...decodeValue('AQID', 'base64')]).toEqual([1, 2, 3])
    expect([...decodeValue('010203', 'hex')]).toEqual([1, 2, 3])
  })

  it('奇数长度或非法字符的十六进制报错', () => {
    expect(() => decodeValue('abc', 'hex')).toThrow(/十六进制格式不正确/)
    expect(() => decodeValue('zz', 'hex')).toThrow(/十六进制格式不正确/)
  })
})

describe('rsa-encrypt / 签名验签', () => {
  it('签名是确定性的（与已知值一致）', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    expect(signature.startsWith(KNOWN_SIGNATURE_PREFIX)).toBe(true)
  })

  it('验签通过', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    await expect(verify(TEXT, signature, DEMO_PUBLIC_KEY, ver)).resolves.toContain('验签通过')
  })

  it('数据被篡改后验签失败（不抛错，给出结论）', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    await expect(verify(TEXT + '!', signature, DEMO_PUBLIC_KEY, ver)).resolves.toContain('验签失败')
  })

  it('未填签名时报错', async () => {
    await expect(verify(TEXT, '   ', DEMO_PUBLIC_KEY, ver)).rejects.toThrow(/需要填入签名/)
  })
})

describe('rsa-encrypt / 加解密', () => {
  it('加密后能解密回原文', async () => {
    const cipher = await encrypt(TEXT, DEMO_PUBLIC_KEY, enc)
    expect(cipher).not.toBe(TEXT)
    await expect(decrypt(cipher, DEMO_PRIVATE_KEY, dec)).resolves.toBe(TEXT)
  })

  it('hex 编码下同样能往返', async () => {
    const hexEnc = { ...enc, encoding: 'hex' } as const
    const hexDec = { ...dec, encoding: 'hex' } as const
    const cipher = await encrypt(TEXT, DEMO_PUBLIC_KEY, hexEnc)
    expect(cipher).toMatch(/^[0-9a-f]+$/)
    await expect(decrypt(cipher, DEMO_PRIVATE_KEY, hexDec)).resolves.toBe(TEXT)
  })

  it('用另一把密钥解密会报错而不是产出乱码', async () => {
    const cipher = await encrypt(TEXT, DEMO_PUBLIC_KEY, enc)
    const other = await globalThis.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    )
    const otherPem = await globalThis.crypto.subtle.exportKey('pkcs8', other.privateKey)
    const base64 = btoa(String.fromCharCode(...new Uint8Array(otherPem)))
    const pem =
      '-----BEGIN PRIVATE KEY-----\n' +
      (base64.match(/.{1,64}/g) ?? []).join('\n') +
      '\n-----END PRIVATE KEY-----\n'
    await expect(decrypt(cipher, pem, dec)).rejects.toThrow()
  })

  it('缺少密钥时提示先粘贴密钥', async () => {
    await expect(encrypt(TEXT, '', enc)).rejects.toThrow(/请先粘贴公钥/)
    await expect(sign(TEXT, '', base)).rejects.toThrow(/请先粘贴私钥/)
  })
})

describe('rsa-encrypt / transform', () => {
  it('按方向分发', async () => {
    const signature = await transform(
      { text: TEXT, publicKey: DEMO_PUBLIC_KEY, privateKey: DEMO_PRIVATE_KEY, signature: '' },
      base,
    )
    expect(signature.startsWith(KNOWN_SIGNATURE_PREFIX)).toBe(true)
  })

  it('空输入返回空串（不触发任何密码学运算）', async () => {
    const empty = { text: '', publicKey: '', privateKey: '', signature: '' }
    await expect(transform(empty, base)).resolves.toBe('')
    await expect(transform(empty, enc)).resolves.toBe('')
    await expect(transform(empty, ver)).resolves.toBe('')
  })
})
