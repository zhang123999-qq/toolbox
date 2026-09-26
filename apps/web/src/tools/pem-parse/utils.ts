import { DEMO_CERTIFICATE, daysBetween, formatAttrs } from '../../lib/x509'
import type { PemParseInput, PemParseOptions } from './schema'

/** 演示证书 / 属性格式化 / 天数差已上提到 lib/x509，这里再导出以兼容本工具既有引用 */
export { DEMO_CERTIFICATE, daysBetween, formatAttrs }

/** PEM 内容的种类：由 `-----BEGIN xxx-----` 的标签决定 */
export type PemKind = 'certificate' | 'privateKey' | 'publicKey' | 'csr' | 'unknown'

/** 标签 → 种类 */
const LABEL_TO_KIND: Record<string, PemKind> = {
  CERTIFICATE: 'certificate',
  'X509 CERTIFICATE': 'certificate',
  'TRUSTED CERTIFICATE': 'certificate',
  'RSA PRIVATE KEY': 'privateKey',
  'PRIVATE KEY': 'privateKey',
  'EC PRIVATE KEY': 'privateKey',
  'ENCRYPTED PRIVATE KEY': 'privateKey',
  'PUBLIC KEY': 'publicKey',
  'RSA PUBLIC KEY': 'publicKey',
  'CERTIFICATE REQUEST': 'csr',
  'NEW CERTIFICATE REQUEST': 'csr',
}

/** 取出第一个 PEM 块的标签 */
export function readLabel(pem: string): string {
  const matched = /-----BEGIN ([A-Za-z0-9 ]+)-----/.exec(pem)
  if (!matched) throw new Error('不是 PEM：缺少 -----BEGIN ...----- 标记')
  return (matched[1] ?? '').trim()
}

/** 判断 PEM 种类 */
export function detectKind(pem: string): PemKind {
  return LABEL_TO_KIND[readLabel(pem)] ?? 'unknown'
}

/** 中文种类名 */
export const KIND_NAMES: Record<PemKind, string> = {
  certificate: 'X.509 证书',
  privateKey: '私钥',
  publicKey: '公钥',
  csr: '证书签名请求（CSR）',
  unknown: '未识别的 PEM 类型',
}

/**
 * 解析 PEM。
 * node-forge 体积不小（数百 KB），故**按需动态 import**，不占首屏。
 * `now` 可注入，让「是否已过期」这类时间判断在单测里可断言。
 */
export async function parsePem(pem: string, now: number = Date.now()): Promise<string> {
  const forge = (await import('node-forge')).default
  const kind = detectKind(pem)
  const lines: string[] = [`类型：${KIND_NAMES[kind]}（${readLabel(pem)}）`]

  if (kind === 'certificate') {
    const cert = forge.pki.certificateFromPem(pem)
    const subject = formatAttrs(cert.subject?.attributes ?? [])
    const issuer = formatAttrs(cert.issuer?.attributes ?? [])
    lines.push(`主题（subject）：${subject}`)
    lines.push(`签发者（issuer）：${issuer === subject ? '同上（自签发）' : issuer}`)
    lines.push(`序列号：${cert.serialNumber ?? '(无)'}`)
    lines.push(`版本：v${(cert.version ?? 0) + 1}`)
    const notBefore = cert.validity?.notBefore as Date | undefined
    const notAfter = cert.validity?.notAfter as Date | undefined
    if (notBefore && notAfter) {
      lines.push(`有效期：${notBefore.toISOString()} → ${notAfter.toISOString()}`)
      const remain = daysBetween(now, notAfter.getTime())
      lines.push(
        now < notBefore.getTime()
          ? `状态：尚未生效（还有 ${daysBetween(now, notBefore.getTime())} 天）`
          : remain > 0
            ? `状态：有效期内（还剩 ${remain} 天）`
            : `状态：已过期（${-remain} 天前到期）`,
      )
    }
    lines.push(`公钥：${describePublicKey(cert.publicKey)}`)
    lines.push(`签名算法：${describeSignature(forge, cert.signatureOid)}`)
    const extensions = (cert.extensions ?? []) as Array<{ name?: string }>
    if (extensions.length > 0) {
      lines.push(`扩展：${extensions.map((item) => item.name ?? '?').join(', ')}`)
    }
    const san = extensions.find((item) => item.name === 'subjectAltName') as
      { altNames?: Array<{ type: number; value: string }> } | undefined
    if (san?.altNames) {
      lines.push(
        `SAN：${san.altNames.map((item) => `${item.type === 2 ? 'DNS' : 'IP'}:${item.value}`).join(', ')}`,
      )
    }
    return lines.join('\n')
  }

  if (kind === 'csr') {
    const csr = forge.pki.certificationRequestFromPem(pem)
    lines.push(`主题（subject）：${formatAttrs(csr.subject?.attributes ?? [])}`)
    lines.push(`公钥：${describePublicKey(csr.publicKey)}`)
    lines.push(`签名算法：${describeSignature(forge, csr.signatureOid)}`)
    lines.push(`自签名校验：${csr.verify() ? '通过（CSR 本身签名正确）' : '未通过'}`)
    return lines.join('\n')
  }

  if (kind === 'privateKey') {
    if (/ENCRYPTED/.test(readLabel(pem))) {
      lines.push('状态：已加密，需要先解密才能读出密钥内容')
      return lines.join('\n')
    }
    const key = forge.pki.privateKeyFromPem(pem)
    lines.push(`算法：${key.n ? 'RSA' : 'EC / 其它'}`)
    if (key.n) lines.push(`长度：${key.n.bitLength()} 位`)
    return lines.join('\n')
  }

  if (kind === 'publicKey') {
    const key = forge.pki.publicKeyFromPem(pem)
    lines.push(`算法：${key.n ? 'RSA' : 'EC / 其它'}`)
    if (key.n) lines.push(`长度：${key.n.bitLength()} 位`)
    return lines.join('\n')
  }

  lines.push('提示：本工具支持证书、私钥、公钥与 CSR，暂不支持该标签')
  return lines.join('\n')
}

/** 公钥摘要 */
function describePublicKey(key: unknown): string {
  const typed = key as { n?: { bitLength(): number }; algorithm?: string }
  if (typed.n) return `RSA ${typed.n.bitLength()} 位`
  return `${typed.algorithm ?? '未知算法'}（非 RSA，无法读位数）`
}

/** 签名算法 OID → 名字 */
function describeSignature(forge: typeof import('node-forge').default, oid: string): string {
  const name = forge.pki.oids[oid]
  return name ? `${name}（${oid}）` : oid
}

export async function transform(input: PemParseInput, _options: PemParseOptions): Promise<string> {
  if (input.text.trim() === '') return ''
  return parsePem(input.text)
}
