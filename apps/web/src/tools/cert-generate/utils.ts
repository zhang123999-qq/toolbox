import type { CertGenerateInput, CertGenerateOptions } from './schema'

const MAX_INPUT = 200_000

/** 校验选项 */
export function assertOptions(options: CertGenerateOptions): void {
  if (options.commonName.trim() === '') {
    throw new Error('请填写通用名（CN），例如 example.localhost')
  }
  if (options.country.trim() !== '' && !/^[A-Za-z]{2}$/.test(options.country.trim())) {
    throw new Error('国家代码（C）必须是两位字母，如 CN / US')
  }
}

/** 逗号分隔的备用域名 → SAN 列表 */
export function parseAltNames(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

/** 用 node-forge 生成自签名证书与私钥 PEM */
export async function generateSelfSigned(
  options: CertGenerateOptions,
): Promise<{ certPem: string; keyPem: string }> {
  const forge = (await import('node-forge')).default
  const bits = Number(options.keySize)
  const keys = forge.pki.rsa.generateKeyPair({ bits })

  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = forge.util.bytesToHex(
    (forge as unknown as { random: { getBytesSync(n: number): string } }).random.getBytesSync(8),
  )
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(Date.now() + Number(options.days) * 86_400_000)

  const attrs: Array<{ name: string; value: string }> = []
  if (options.commonName.trim())
    attrs.push({ name: 'commonName', value: options.commonName.trim() })
  if (options.organization.trim())
    attrs.push({ name: 'organizationName', value: options.organization.trim() })
  if (options.organizationalUnit.trim())
    attrs.push({ name: 'organizationalUnitName', value: options.organizationalUnit.trim() })
  if (options.country.trim())
    attrs.push({ name: 'countryName', value: options.country.trim().toUpperCase() })

  cert.setSubject(attrs)
  cert.setIssuer(attrs) // 自签名：签发者 = 主体

  const extensions: Array<Record<string, unknown>> = [
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, cRLSign: true },
  ]
  const altNames = parseAltNames(options.altNames)
  if (altNames.length > 0) {
    extensions.push({
      name: 'subjectAltName',
      altNames: altNames.map((value) => ({ type: 2, value })),
    })
  }
  cert.setExtensions(extensions)

  cert.sign(keys.privateKey, forge.md.sha256.create())

  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  }
}

export async function transform(
  input: CertGenerateInput,
  options: CertGenerateOptions,
): Promise<string> {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  assertOptions(options)
  const { certPem, keyPem } = await generateSelfSigned(options)
  return [
    '# 证书（cert.pem）',
    certPem.trim(),
    '',
    '# 私钥（key.pem）—— 妥善保管，切勿泄露',
    keyPem.trim(),
  ].join('\n')
}
