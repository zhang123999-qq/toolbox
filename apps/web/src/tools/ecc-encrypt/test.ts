import { describe, expect, it } from 'vitest'
import {
  CURVES,
  DEMO_PRIVATE_KEY,
  DEMO_PUBLIC_KEY,
  deriveSharedSecret,
  generateKeyPair,
  pemToDer,
  requireCurve,
  transform,
} from './utils'

const derive = { direction: 'derive', curve: 'P-256', encoding: 'base64' } as const
const generate = { ...derive, direction: 'generate' } as const

/** 演示密钥对协商出的共享密钥（确定性，可硬断言） */
const KNOWN_SECRET = 'koUH48K8QJoy6DOIyAFXfpChmIlyRbKhtSbrn03LfL8='
const KNOWN_SECRET_HEX = '928507e3c2bc409a32e83388c801577e90a198897245b2a1b526eb9f4dcb7cbf'

describe('ecc-encrypt / 基础编解码', () => {
  it('PEM 解析出 DER 字节', () => {
    expect(pemToDer(DEMO_PUBLIC_KEY).length).toBe(91)
  })

  it('空密钥与非 PEM 输入分别给出可读错误', () => {
    expect(() => pemToDer('   ')).toThrow(/密钥为空/)
    expect(() => pemToDer('not a key')).toThrow(/不是合法的 PEM/)
  })

  it('曲线取值受白名单约束', () => {
    expect(requireCurve('P-384')).toBe('P-384')
    expect(() => requireCurve('secp256k1')).toThrow(/不支持的曲线/)
    expect(CURVES).toEqual(['P-256', 'P-384', 'P-521'])
  })
})

describe('ecc-encrypt / 密钥协商', () => {
  it('同一对密钥协商出已知共享密钥', async () => {
    const secret = await deriveSharedSecret(DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY, 'P-256')
    expect(btoa(String.fromCharCode(...secret))).toBe(KNOWN_SECRET)
  })

  it('hex 编码下得到同一字节', async () => {
    const secret = await deriveSharedSecret(DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY, 'P-256')
    const hex = [...secret].map((b) => b.toString(16).padStart(2, '0')).join('')
    expect(hex).toBe(KNOWN_SECRET_HEX)
  })

  it('双方各自持有同一对密钥时结果一致', async () => {
    const pair = await generateKeyPair('P-256')
    const mine = await deriveSharedSecret(pair.privateKey, pair.publicKey, 'P-256')
    const theirs = await deriveSharedSecret(pair.privateKey, pair.publicKey, 'P-256')
    expect([...mine]).toEqual([...theirs])
  })

  it('生成的密钥对是合法 PEM 且能被重新导入', async () => {
    const pair = await generateKeyPair('P-384')
    expect(pair.publicKey).toContain('-----BEGIN PUBLIC KEY-----')
    expect(pair.privateKey).toContain('-----BEGIN PRIVATE KEY-----')
    expect(pemToDer(pair.privateKey).length).toBeGreaterThan(0)
  })
})

describe('ecc-encrypt / transform', () => {
  it('协商方向输出已知共享密钥', async () => {
    await expect(
      transform(
        { text: 'derive', publicKey: DEMO_PUBLIC_KEY, privateKey: DEMO_PRIVATE_KEY },
        derive,
      ),
    ).resolves.toBe(KNOWN_SECRET)
  })

  it('生成方向输出两份 PEM', async () => {
    const out = await transform({ text: 'generate', publicKey: '', privateKey: '' }, generate)
    expect(out).toContain('-----BEGIN PUBLIC KEY-----')
    expect(out).toContain('-----BEGIN PRIVATE KEY-----')
  })

  it('缺少密钥时报错', async () => {
    await expect(transform({ text: 'x', publicKey: '', privateKey: '' }, derive)).rejects.toThrow(
      /己方私钥/,
    )
    await expect(
      transform({ text: 'x', publicKey: '', privateKey: DEMO_PRIVATE_KEY }, derive),
    ).rejects.toThrow(/对方公钥/)
  })

  it('空输入返回空串（不触发任何密码学运算）', async () => {
    await expect(transform({ text: '', publicKey: '', privateKey: '' }, derive)).resolves.toBe('')
    await expect(transform({ text: '', publicKey: '', privateKey: '' }, generate)).resolves.toBe('')
  })
})
