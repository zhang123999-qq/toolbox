import { CompactEncrypt } from 'jose'
import { describe, expect, it } from 'vitest'
import { assertCompact, decryptJwe, deriveKey, transform } from './utils'

const SECRET = 'demo-secret-1234567890-demo-secret'

/** 演示口令派生出的密钥（确定性，可硬断言） */
const KEY_HEX = '2ca14b9c0e7fae02ad18a017797aa82e4b1cf8bf8e02caf3c50fbd29123f2223'

/** 用演示密钥加密固定明文得到的 JWE */
const JWE =
  'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..yw7egmC1HndX1rp2.qWLdkuwWus2nYzE4Jbye-CkIWvc81g7exWHOvW3PVJ5dzIIkVSs.50UJFMKhbCdXVRYCxSf5xA'
const PLAINTEXT = '这是一段被 JWE 加密的明文。'

/** 加密（测试用）：与工具侧的解密互为逆运算 */
async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    await deriveKey(secret),
    { name: 'AES-GCM' },
    true,
    ['encrypt'],
  )
  return new CompactEncrypt(new TextEncoder().encode(plaintext))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(key)
}

describe('jwe-parse / 密钥派生', () => {
  it('口令 → 32 字节密钥（SHA-256，确定性）', async () => {
    const key = await deriveKey(SECRET)
    expect(key.length).toBe(32)
    expect([...key].map((b) => b.toString(16).padStart(2, '0')).join('')).toBe(KEY_HEX)
  })

  it('未填口令时报错', async () => {
    await expect(deriveKey('')).rejects.toThrow(/请先填写口令/)
  })
})

describe('jwe-parse / 解密', () => {
  it('解密示例 JWE 得到已知明文', async () => {
    await expect(decryptJwe(JWE, SECRET)).resolves.toBe(PLAINTEXT)
  })

  it('自己加密再解密能往返', async () => {
    const token = await encrypt('round trip 测试 🚀', SECRET)
    await expect(decryptJwe(token, SECRET)).resolves.toBe('round trip 测试 🚀')
  })

  it('口令错误时报错（GCM 认证失败）', async () => {
    await expect(decryptJwe(JWE, SECRET + 'x')).rejects.toThrow()
  })

  it('不是 5 段时给出可读错误', () => {
    expect(() => assertCompact('a.b.c')).toThrow(/应由 5 段组成/)
    expect(() => assertCompact('')).toThrow(/应由 5 段组成/)
  })
})

describe('jwe-parse / transform', () => {
  it('整体流程：示例解密成功', async () => {
    await expect(transform({ text: JWE, secret: SECRET }, {})).resolves.toBe(PLAINTEXT)
  })

  it('空输入返回空串（不触发解密）', async () => {
    await expect(transform({ text: '', secret: SECRET }, {})).resolves.toBe('')
    await expect(transform({ text: '   ', secret: '' }, {})).resolves.toBe('')
  })
})
