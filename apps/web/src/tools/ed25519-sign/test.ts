import { describe, expect, it } from 'vitest'
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY, pemToDer, sign, transform, verify } from './utils'

const base = { direction: 'sign', encoding: 'base64' } as const
const ver = { ...base, direction: 'verify' } as const

const TEXT = '这是一段需要 Ed25519 签名的数据。'

/** 演示密钥 + 示例文本在 Ed25519 下的签名（RFC 8032 确定性，可硬断言） */
const KNOWN_SIGNATURE =
  'fxcfs39OTMuwxhNoTJX7rABccmrrbdmoiN6B2a+paUlL98jEN3HENSNE6hnLWJGuH+glNm4ldFMP/6k6EXO5Dw=='
const KNOWN_SIGNATURE_HEX =
  '7f171fb37f4e4ccbb0c613684c95fbac005c726aeb6dd9a888de81d9afa969494bf7c8c43771c4352344ea19cb5891ae1fe825366e2574530fffa93a1173b90f'

describe('ed25519-sign / 签名', () => {
  it('签名是确定性的（与已知值一致）', async () => {
    await expect(sign(TEXT, DEMO_PRIVATE_KEY, base)).resolves.toBe(KNOWN_SIGNATURE)
  })

  it('hex 编码得到同一字节', async () => {
    await expect(sign(TEXT, DEMO_PRIVATE_KEY, { ...base, encoding: 'hex' })).resolves.toBe(
      KNOWN_SIGNATURE_HEX,
    )
  })

  it('签名长度恒为 64 字节', async () => {
    const signature = await sign(TEXT, DEMO_PRIVATE_KEY, base)
    expect(atob(signature).length).toBe(64)
  })

  it('缺少私钥时报错', async () => {
    await expect(sign(TEXT, '  ', base)).rejects.toThrow(/请先粘贴私钥/)
  })
})

describe('ed25519-sign / 验签', () => {
  it('验签通过', async () => {
    await expect(verify(TEXT, KNOWN_SIGNATURE, DEMO_PUBLIC_KEY, ver)).resolves.toContain('验签通过')
  })

  it('数据被改动后验签失败（给结论而不是抛错）', async () => {
    await expect(verify(TEXT + '!', KNOWN_SIGNATURE, DEMO_PUBLIC_KEY, ver)).resolves.toContain(
      '验签失败',
    )
  })

  it('签名被截断或非法编码时判定失败而不是崩溃', async () => {
    await expect(verify(TEXT, 'AAAA', DEMO_PUBLIC_KEY, ver)).resolves.toContain('验签失败')
    await expect(verify(TEXT, 'zz', DEMO_PUBLIC_KEY, { ...ver, encoding: 'hex' })).rejects.toThrow(
      /十六进制格式不正确/,
    )
  })

  it('未填签名时报错', async () => {
    await expect(verify(TEXT, '', DEMO_PUBLIC_KEY, ver)).rejects.toThrow(/需要填入签名/)
  })
})

describe('ed25519-sign / transform', () => {
  it('签名方向输出已知签名', async () => {
    await expect(
      transform(
        { text: TEXT, privateKey: DEMO_PRIVATE_KEY, publicKey: DEMO_PUBLIC_KEY, signature: '' },
        base,
      ),
    ).resolves.toBe(KNOWN_SIGNATURE)
  })

  it('PEM 解析与空输入短路', async () => {
    expect(pemToDer(DEMO_PUBLIC_KEY).length).toBe(44)
    const empty = { text: '', privateKey: '', publicKey: '', signature: '' }
    await expect(transform(empty, base)).resolves.toBe('')
    await expect(transform(empty, ver)).resolves.toBe('')
  })
})
