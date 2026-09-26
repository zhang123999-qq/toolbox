import { describe, expect, it } from 'vitest'
import forgeLib from 'node-forge'
import { CsrGenerateError, parseAltNames, transform } from './utils'
import type { CsrGenerateInput, CsrGenerateOptions } from './schema'

const forge = forgeLib
const input: CsrGenerateInput = { text: 'generate' }

const baseOptions: CsrGenerateOptions = {
  commonName: 'example.com',
  organization: 'Acme Inc.',
  organizationalUnit: 'IT',
  country: 'CN',
  altNames: 'www.example.com, example.com, 127.0.0.1',
  keySize: '2048',
  includePrivateKey: false,
}

describe('csr-generate / parseAltNames', () => {
  it('域名走 DNS、IP 走 IP 项，忽略空白项', () => {
    expect(parseAltNames('a.com, b.com\n  10.0.0.1 , ::1')).toEqual([
      { type: 2, value: 'a.com' },
      { type: 2, value: 'b.com' },
      { type: 7, ip: '10.0.0.1' },
      { type: 7, ip: '::1' },
    ])
  })
})

describe('csr-generate / transform', () => {
  it('生成可解析、验签通过且主题正确的 CSR', async () => {
    const pem = await transform(input, baseOptions)
    expect(pem).toContain('-----BEGIN CERTIFICATE REQUEST-----')
    expect(pem).toContain('-----END CERTIFICATE REQUEST-----')

    const csr = forge.pki.certificationRequestFromPem(pem)
    expect(csr.verify()).toBe(true)
    const attrs = Object.fromEntries(
      csr.subject.attributes.map((a: { name: string; value: string }) => [a.name, a.value]),
    )
    expect(attrs['commonName']).toBe('example.com')
    expect(attrs['organizationName']).toBe('Acme Inc.')
    expect(attrs['organizationalUnitName']).toBe('IT')
    expect(attrs['countryName']).toBe('CN')
  })

  it('SAN 扩展包含 DNS 与 IP', async () => {
    const pem = await transform(input, baseOptions)
    const csr = forge.pki.certificationRequestFromPem(pem)
    const extReq = csr.attributes.find((a: { name: string }) => a.name === 'extensionRequest') as
      | {
          extensions?: Array<{
            name: string
            altNames?: Array<{ type: number; value?: string; ip?: string }>
          }>
        }
      | undefined
    const san = extReq?.extensions?.find((e) => e.name === 'subjectAltName')
    expect(san?.altNames?.map((a) => (a.type === 7 ? a.ip : a.value))).toEqual([
      'www.example.com',
      'example.com',
      '127.0.0.1',
    ])
  })

  it('includePrivateKey 时附带可解析的 RSA 私钥', async () => {
    const pem = await transform(input, { ...baseOptions, includePrivateKey: true })
    expect(pem).toContain('-----BEGIN RSA PRIVATE KEY-----')
    const keyPem = pem.slice(pem.indexOf('-----BEGIN RSA PRIVATE KEY-----'))
    expect(() => forge.pki.privateKeyFromPem(keyPem)).not.toThrow()
  })

  it('国家小写会归一为大写（边界）', async () => {
    const pem = await transform(input, { ...baseOptions, country: 'us' })
    const csr = forge.pki.certificationRequestFromPem(pem)
    const country = csr.subject.attributes.find(
      (a: { name: string }) => a.name === 'countryName',
    ) as { value?: string } | undefined
    expect(country?.value).toBe('US')
  })

  it('CN 为空 / 国家码非法抛错（异常）', async () => {
    await expect(transform(input, { ...baseOptions, commonName: '   ' })).rejects.toBeInstanceOf(
      CsrGenerateError,
    )
    await expect(transform(input, { ...baseOptions, country: 'CHN' })).rejects.toBeInstanceOf(
      CsrGenerateError,
    )
  })
})
