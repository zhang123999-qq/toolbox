import { describe, expect, it } from 'vitest'
import type { CertParserInput } from './schema'
import { DEMO_CERTIFICATE, parseCertificate, transform } from './utils'

const input = (text: string): CertParserInput => ({ text })

describe('cert-parser / parseCertificate', () => {
  it('解析内置示例证书，输出主体/签发者/公钥/SAN', async () => {
    const out = await parseCertificate(DEMO_CERTIFICATE)
    expect(out).toContain('主体（Subject）：')
    expect(out).toContain('demo.toolbox.local')
    expect(out).toContain('RSA 2048 位')
    expect(out).toContain('SAN（subjectAltName）：')
    expect(out).toContain('SHA-256 指纹：')
  })

  it('RSA 公钥指数 e 应为 65537（十进制，勿按十六进制误读）', async () => {
    const out = await parseCertificate(DEMO_CERTIFICATE)
    expect(out).toContain('公钥指数 e：65537')
    expect(out).not.toContain('415031')
  })

  it('非法 PEM 抛错', async () => {
    await expect(parseCertificate('not a cert')).rejects.toThrow(/无法解析证书/)
  })
})

describe('cert-parser / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform(input('   '), {})).resolves.toBe('')
  })

  it('端到端：示例证书输出关键字段', async () => {
    const out = await transform(input(DEMO_CERTIFICATE), {})
    expect(out).toContain('过期时间：')
    expect(out).toContain('签名算法：')
  })

  it('超长输入报错', async () => {
    await expect(transform(input('x'.repeat(100_001)), {})).rejects.toThrow(/上限/)
  })

  it('非法内容走错误态', async () => {
    await expect(transform(input('garbage'), {})).rejects.toThrow(/无法解析证书/)
  })
})
