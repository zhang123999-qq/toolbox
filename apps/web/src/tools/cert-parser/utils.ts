import { DEMO_CERTIFICATE, daysBetween, formatAttrs } from '../../lib/x509'
import type { CertParserInput, CertParserOptions } from './schema'

const MAX_INPUT = 100_000

export { DEMO_CERTIFICATE }

interface CertLike {
  subject?: { attributes?: unknown[] }
  issuer?: { attributes?: unknown[] }
  validity?: { notBefore?: Date; notAfter?: Date }
  serialNumber?: string
  signatureOid?: string
  publicKey?: {
    n?: { toString(radix?: number): string; bitLength(): number }
    e?: { toString(): string }
    bitLength?: () => number
  }
  extensions?: Array<{ name?: string; altNames?: Array<{ type: number; value: string }> }>
}

/** node-forge 动态解析证书，返回可读文本 */
export async function parseCertificate(pem: string): Promise<string> {
  const forge = (await import('node-forge')).default
  let cert: CertLike
  try {
    cert = forge.pki.certificateFromPem(pem) as CertLike
  } catch {
    throw new Error('无法解析证书，请粘贴完整的 -----BEGIN CERTIFICATE----- PEM 内容')
  }

  const lines: string[] = []
  lines.push('主体（Subject）：' + formatAttrs(cert.subject?.attributes ?? []))
  lines.push('签发者（Issuer）：' + formatAttrs(cert.issuer?.attributes ?? []))

  const notBefore = cert.validity?.notBefore
  const notAfter = cert.validity?.notAfter
  if (notBefore && notAfter) {
    lines.push(`生效时间：${notBefore.toISOString()}`)
    lines.push(`过期时间：${notAfter.toISOString()}`)
    const remain = daysBetween(Date.now(), notAfter.getTime())
    lines.push(`剩余有效期：${remain > 0 ? `还剩 ${remain} 天` : `已过期 ${-remain} 天`}`)
  }

  if (cert.serialNumber) lines.push(`序列号：${cert.serialNumber.toUpperCase()}`)

  const sigName = cert.signatureOid
    ? (forge.pki.oids[cert.signatureOid] ?? cert.signatureOid)
    : '未知'
  lines.push(`签名算法：${sigName}`)

  const pub = cert.publicKey
  if (pub?.n) {
    lines.push(`公钥：RSA ${pub.n.bitLength()} 位`)
    // forge 的 BigInteger.toString() 默认按十进制输出（如 "65537"）
    lines.push(`公钥指数 e：${pub.e ? pub.e.toString() : 65537}`)
  } else if (pub) {
    lines.push(`公钥：非 RSA（EC / 其它），位长 ${pub.bitLength?.() ?? '未知'}`)
  }

  const san = cert.extensions?.find((ext) => ext.name === 'subjectAltName')
  const altNames = san?.altNames ?? []
  if (altNames.length > 0) {
    lines.push('SAN（subjectAltName）：')
    for (const name of altNames) {
      lines.push(`  - ${name.type === 2 ? 'DNS' : name.type === 7 ? 'IP' : '其它'}: ${name.value}`)
    }
  } else {
    lines.push('SAN：无')
  }

  try {
    const pkiAny = forge.pki as unknown as { certificateToAsn1: (c: unknown) => unknown }
    const der = (forge.asn1 as unknown as { toDer: (a: unknown) => { getBytes(): string } })
      .toDer(pkiAny.certificateToAsn1(cert))
      .getBytes()
    const sha256 = forge.md.sha256.create().update(der).digest().toHex()
    lines.push('SHA-256 指纹：' + sha256.replace(/(.{2})(?=.)/g, '$1:'))
  } catch {
    // 指纹计算失败不影响主体输出
  }

  return lines.join('\n')
}

export async function transform(
  input: CertParserInput,
  _options: CertParserOptions,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`证书超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  return parseCertificate(input.text)
}
