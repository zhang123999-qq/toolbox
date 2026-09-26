import { describe, expect, it } from 'vitest'
import {
  checkCertificatePem,
  checkKeyStrength,
  checkSignature,
  checkValidity,
  DEMO_CERTIFICATE,
  evaluate,
  renderReport,
  SslCheckError,
  transform,
} from './utils'
import type { SslCheckInput } from './schema'

const input = (text: string): SslCheckInput => ({ text })

/** 构造一个最小证书对象用于纯规则单测 */
function fakeCert(overrides: Record<string, unknown> = {}): never {
  return {
    subject: { attributes: [{ shortName: 'CN', value: 'example.com' }] },
    issuer: { attributes: [{ shortName: 'CN', value: 'DigiCert' }] },
    validity: {
      notBefore: new Date('2025-01-01T00:00:00Z'),
      notAfter: new Date('2027-01-01T00:00:00Z'),
    },
    publicKey: { n: { bitLength: () => 2048 } },
    extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'example.com' }] }],
    ...overrides,
  } as never
}

const NOW = Date.parse('2026-06-01T00:00:00Z')

describe('ssl-check / 纯规则', () => {
  it('有效期：正常 / 即将过期 / 已过期 / 未生效', () => {
    expect(checkValidity(fakeCert(), NOW).status).toBe('pass')
    expect(
      checkValidity(
        fakeCert({
          validity: { notBefore: new Date('2025-01-01'), notAfter: new Date('2026-06-15') },
        }),
        NOW,
      ).status,
    ).toBe('warn')
    expect(
      checkValidity(
        fakeCert({
          validity: { notBefore: new Date('2024-01-01'), notAfter: new Date('2026-01-01') },
        }),
        NOW,
      ).status,
    ).toBe('fail')
    expect(
      checkValidity(
        fakeCert({
          validity: { notBefore: new Date('2027-01-01'), notAfter: new Date('2029-01-01') },
        }),
        NOW,
      ).status,
    ).toBe('fail')
  })

  it('签名算法：sha1 判问题，sha256 通过', () => {
    expect(checkSignature('sha1WithRSAEncryption').status).toBe('fail')
    expect(checkSignature('md5WithRSAEncryption').status).toBe('fail')
    expect(checkSignature('sha256WithRSAEncryption').status).toBe('pass')
  })

  it('密钥强度：RSA <2048 判问题', () => {
    expect(checkKeyStrength(fakeCert({ publicKey: { n: { bitLength: () => 1024 } } })).status).toBe(
      'fail',
    )
    expect(checkKeyStrength(fakeCert({ publicKey: { n: { bitLength: () => 2048 } } })).status).toBe(
      'pass',
    )
  })

  it('自签名识别与 SAN 缺失告警', () => {
    const self = fakeCert({
      issuer: { attributes: [{ shortName: 'CN', value: 'example.com' }] },
    })
    const report = evaluate(self, 'sha256WithRSAEncryption', NOW)
    expect(report.warnCount).toBeGreaterThan(0) // 自签名
    expect(checkValidity.name).toBeTruthy()
    const noSan = fakeCert({ extensions: [] })
    expect(
      evaluate(noSan, 'sha256WithRSAEncryption', NOW).checks.find((c) => c.id === 'san')?.status,
    ).toBe('warn')
  })
})

describe('ssl-check / 真实 PEM 解析', () => {
  it('内置示例证书：仅自签名警告，其余通过', async () => {
    const report = await checkCertificatePem(DEMO_CERTIFICATE, Date.parse('2026-06-01T00:00:00Z'))
    expect(report.failCount).toBe(0)
    expect(report.checks.find((c) => c.id === 'self-signed')?.status).toBe('warn')
    expect(report.checks.find((c) => c.id === 'validity')?.status).toBe('pass')
    expect(renderReport(report)).toContain('总体结论')
  })

  it('非法 PEM 抛 SslCheckError', async () => {
    await expect(checkCertificatePem('not a certificate at all', NOW)).rejects.toBeInstanceOf(
      SslCheckError,
    )
  })
})

describe('ssl-check / transform', () => {
  it('空输入返回空串；超长抛错（边界）', async () => {
    await expect(transform(input('  '), {})).resolves.toBe('')
    await expect(transform(input('x'.repeat(100_001)), {})).rejects.toBeInstanceOf(SslCheckError)
  })

  it('端到端：示例证书输出体检文本', async () => {
    const text = await transform(input(DEMO_CERTIFICATE), {})
    expect(text).toContain('检查项')
    expect(text).toContain('SAN')
  })
})
