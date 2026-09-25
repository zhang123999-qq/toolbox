import { describe, expect, it } from 'vitest'
import {
  DEMO_PRIVATE_KEY,
  DEMO_PUBLIC_KEY,
  decodeValue,
  encodeBytes,
  pemToDer,
  requireOption,
  signatureLength,
  sign,
  transform,
  verify,
} from './utils'

const base = { direction: 'sign', curve: 'P-256', hash: 'SHA-256', encoding: 'base64' } as const
const ver = { ...base, direction: 'verify' } as const

const TEXT = '这是一段需要 ECDSA 签名的数据。'

describe('ecdsa-sign / 参数与编码', () => {
  it('签名长度随曲线变化（r‖s）', () => {
    expect(signatureLength('P-256')).toBe(64)
    expect(signatureLength('P-384')).toBe(96)
    expect(signatureLength('P-521')).toBe(132)
  })

  it('非法曲线 / 摘要直接报错', () => {
    expect(requireOption('P-256', ['P-256'], '曲线')).toBe('P-256')
    expect(() => requireOption('secp256k1', ['P-256'], '曲线')).toThrow(/不支持的曲线/)
  })

  it('Base64 与十六进制编解码一致', () => {
    const bytes = Uint8Array.from([1, 2, 3])
    expect(encodeBytes(bytes, { ...base, encoding: 'base64' })).toBe('AQID')
    expect(encodeBytes(bytes, { ...base, encoding: 'hex' })).toBe('010203')
    expect([...decodeValue('AQID', 'base64')]).toEqual([1, 2, 3])
    expect([...decodeValue('010203', 'hex')]).toEqual([1, 2, 3])
  })

  it('PEM 解析与错误提示', () => {
    expect(pemToDer(DEMO_PUBLIC_KEY).length).toBe(91)
    expect(() => pemToDer('')).toThrow(/密钥为空/)
  })
})

describe('ecdsa-sign / 签名验签', () => {
  it('签名后能验签通过', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    expect(atob(signature).length).toBe(64)
    await expect(verify(TEXT, signature, DEMO_PUBLIC_KEY, ver)).resolves.toContain('验签通过')
  })

  it('hex 编码的签名同样能验过', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, { ...base, encoding: 'hex' })
    expect(signature).toMatch(/^[0-9a-f]{128}$/)
    await expect(
      verify(TEXT, signature, DEMO_PUBLIC_KEY, { ...ver, encoding: 'hex' }),
    ).resolves.toContain('验签通过')
  })

  it('数据被改动后验签失败', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    await expect(verify(TEXT + '!', signature, DEMO_PUBLIC_KEY, ver)).resolves.toContain('验签失败')
  })

  it('摘要算法不一致时验签失败', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, { ...base, hash: 'SHA-512' })
    await expect(verify(TEXT, signature, DEMO_PUBLIC_KEY, ver)).resolves.toContain('验签失败')
  })

  it('签名含随机 nonce：两次签名结果不同', async () => {
    const first = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    const second = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    expect(first === second).toBe(false)
  })

  it('缺少密钥或未填签名时报错', async () => {
    await expect(sign(TEXT, '', base)).rejects.toThrow(/请先粘贴私钥/)
    await expect(verify(TEXT, '', DEMO_PUBLIC_KEY, ver)).rejects.toThrow(/需要填入签名/)
  })
})

describe('ecdsa-sign / transform', () => {
  it('签名方向产出可验签的签名', async () => {
    const signature = await transform(
      { text: TEXT, privateKey: DEMO_PRIVATE_KEY, publicKey: DEMO_PUBLIC_KEY, signature: '' },
      base,
    )
    expect(atob(signature).length).toBe(64)
  })

  it('空输入返回空串（不触发任何密码学运算）', async () => {
    const empty = { text: '', privateKey: '', publicKey: '', signature: '' }
    await expect(transform(empty, base)).resolves.toBe('')
    await expect(transform(empty, ver)).resolves.toBe('')
  })
})
