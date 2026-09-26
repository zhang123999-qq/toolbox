import { describe, expect, it } from 'vitest'
import type { CertGenerateOptions } from './schema'
import { assertOptions, generateSelfSigned, parseAltNames, transform } from './utils'

const base: CertGenerateOptions = {
  commonName: 'example.localhost',
  organization: 'Test',
  organizationalUnit: 'Dev',
  country: 'CN',
  days: '365',
  keySize: '2048',
  altNames: 'a.localhost, b.localhost',
}

describe('cert-generate / parseAltNames', () => {
  it('逗号换行分隔去空', () => {
    expect(parseAltNames('a, b\n c')).toEqual(['a', 'b', 'c'])
  })
})

describe('cert-generate / assertOptions', () => {
  it('CN 必填', () => {
    expect(() => assertOptions({ ...base, commonName: '  ' })).toThrow(/通用名/)
  })
  it('国家必须两位字母', () => {
    expect(() => assertOptions({ ...base, country: 'CHN' })).toThrow(/两位字母/)
    expect(() => assertOptions({ ...base, country: 'CN' })).not.toThrow()
  })
})

describe('cert-generate / generateSelfSigned', () => {
  it('产出证书与私钥 PEM，且 SAN 写入', async () => {
    const { certPem, keyPem } = await generateSelfSigned(base)
    expect(certPem).toContain('-----BEGIN CERTIFICATE-----')
    expect(keyPem).toContain('-----BEGIN RSA PRIVATE KEY-----')
    // 能被 node-forge 反向解析即结构合法
    const forge = (await import('node-forge')).default
    const cert = forge.pki.certificateFromPem(certPem)
    expect(forge.pki.certificateToPem(cert)).toContain('BEGIN CERTIFICATE')
    const san = cert.extensions?.find((e: { name?: string }) => e.name === 'subjectAltName')
    expect(JSON.stringify(san)).toContain('a.localhost')
  })
})

describe('cert-generate / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })
  it('端到端输出证书与私钥两段', async () => {
    const out = await transform({ text: 'x' }, base)
    expect(out).toContain('# 证书（cert.pem）')
    expect(out).toContain('-----BEGIN CERTIFICATE-----')
    expect(out).toContain('-----BEGIN RSA PRIVATE KEY-----')
  })
  it('缺 CN 抛错', async () => {
    await expect(transform({ text: 'x' }, { ...base, commonName: '' })).rejects.toThrow(/通用名/)
  })
  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, base)).rejects.toThrow(/上限/)
  })
})
