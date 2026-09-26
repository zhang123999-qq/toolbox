import type { CsrGenerateInput, CsrGenerateOptions } from './schema'

/** 生成失败时抛出，由 UI 捕获展示 */
export class CsrGenerateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsrGenerateError'
  }
}

type Forge = typeof import('node-forge').default

/** 生成 RSA 密钥对（隔离便于说明耗时来源） */
async function generateKeyPair(forge: Forge, bits: number) {
  return forge.pki.rsa.generateKeyPair({ bits })
}

/** 解析备用域名：逗号 / 换行分隔；IPv4 / IPv6 走 IP 项，其余走 DNS 项 */
export function parseAltNames(raw: string): Array<{ type: number; ip?: string; value?: string }> {
  const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
  const IPV6 = /^[0-9a-fA-F:]+$/
  return raw
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .map((item) => {
      if (IPV4.test(item) || (item.includes(':') && IPV6.test(item))) {
        return { type: 7, ip: item }
      }
      return { type: 2, value: item }
    })
}

/**
 * 生成 CSR（PEM），可选同时返回私钥 PEM。
 * 全程本地完成，私钥不会离开浏览器。
 */
export async function transform(
  _input: CsrGenerateInput,
  options: CsrGenerateOptions,
): Promise<string> {
  const cn = options.commonName.trim()
  if (cn === '') throw new CsrGenerateError('通用名（CN）不能为空')
  if (options.country !== '' && !/^[A-Za-z]{2}$/.test(options.country)) {
    throw new CsrGenerateError('国家必须为 2 位字母（如 CN、US）')
  }

  const forge = (await import('node-forge')).default
  const bits = Number.parseInt(options.keySize, 10)
  const keys = await generateKeyPair(forge, bits)

  const csr = forge.pki.createCertificationRequest()
  csr.publicKey = keys.publicKey

  const subject = [{ name: 'commonName', value: cn }]
  if (options.country.trim() !== '') {
    subject.push({ name: 'countryName', value: options.country.trim().toUpperCase() })
  }
  if (options.organization.trim() !== '') {
    subject.push({ name: 'organizationName', value: options.organization.trim() })
  }
  if (options.organizationalUnit.trim() !== '') {
    subject.push({ name: 'organizationalUnitName', value: options.organizationalUnit.trim() })
  }
  csr.setSubject(subject)

  // SAN：现代证书主要依赖扩展里的备用域名
  const altNames = parseAltNames(options.altNames)
  if (altNames.length > 0) {
    csr.setAttributes([
      {
        name: 'extensionRequest',
        extensions: [{ name: 'subjectAltName', altNames }],
      },
    ])
  }

  // node-forge 的 sign() 不返回值，失败会抛错；这里直接调用
  csr.sign(keys.privateKey, forge.md.sha256.create())

  const parts: string[] = [forge.pki.certificationRequestToPem(csr)]
  if (options.includePrivateKey) {
    parts.push(forge.pki.privateKeyToPem(keys.privateKey))
  }
  return parts.join('\n')
}
