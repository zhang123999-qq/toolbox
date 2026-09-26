import { DEMO_CERTIFICATE, daysBetween, formatAttrs } from '../../lib/x509'
import type { SslCheckInput, SslCheckOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class SslCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SslCheckError'
  }
}

const MAX_INPUT = 100_000
/** 剩余有效期小于等于该天数时告警 */
export const EXPIRY_WARN_DAYS = 30

export { DEMO_CERTIFICATE }

type Status = 'pass' | 'warn' | 'fail'

export interface Check {
  readonly id: string
  readonly label: string
  readonly status: Status
  readonly detail: string
}

interface CertificateLike {
  readonly subject?: { attributes?: readonly unknown[] }
  readonly issuer?: { attributes?: readonly unknown[] }
  readonly validity?: { notBefore?: Date; notAfter?: Date }
  readonly publicKey?: { n?: { bitLength(): number }; algorithm?: string }
  readonly signatureOid?: string
  readonly extensions?: Array<{ name?: string; altNames?: Array<{ type: number; value: string }> }>
}

export interface Report {
  readonly checks: readonly Check[]
  readonly info: Readonly<Record<string, string>>
  readonly failCount: number
  readonly warnCount: number
}

/** 证书是否自签名：subject 与 issuer 的属性串一致 */
export function isSelfSigned(cert: CertificateLike): boolean {
  const subject = formatAttrs(cert.subject?.attributes ?? [])
  const issuer = formatAttrs(cert.issuer?.attributes ?? [])
  return subject !== '' && subject === issuer
}

/** 有效期检查：未生效 / 已过期 / 即将过期 / 正常 */
export function checkValidity(cert: CertificateLike, now: number): Check {
  const notBefore = cert.validity?.notBefore
  const notAfter = cert.validity?.notAfter
  if (!notBefore || !notAfter) {
    return { id: 'validity', label: '有效期', status: 'warn', detail: '证书缺少有效期字段' }
  }
  const start = notBefore.getTime()
  const end = notAfter.getTime()
  if (now < start) {
    return {
      id: 'validity',
      label: '有效期',
      status: 'fail',
      detail: `证书尚未生效（${notBefore.toISOString()} 起生效）`,
    }
  }
  const remain = daysBetween(now, end)
  if (remain <= 0) {
    return {
      id: 'validity',
      label: '有效期',
      status: 'fail',
      detail: `证书已过期（${notAfter.toISOString()} 到期，已过期 ${-remain} 天）`,
    }
  }
  if (remain <= EXPIRY_WARN_DAYS) {
    return {
      id: 'validity',
      label: '有效期',
      status: 'warn',
      detail: `证书将在 ${remain} 天后过期（${notAfter.toISOString()}），请尽快续签`,
    }
  }
  return {
    id: 'validity',
    label: '有效期',
    status: 'pass',
    detail: `有效期内，还剩 ${remain} 天（至 ${notAfter.toISOString()}）`,
  }
}

/** 自签名检查 */
export function checkSelfSigned(cert: CertificateLike): Check {
  if (isSelfSigned(cert)) {
    return {
      id: 'self-signed',
      label: '信任链',
      status: 'warn',
      detail: '自签名证书：浏览器 / 客户端默认不信任，仅适合内网或测试，公网服务需由受信 CA 签发',
    }
  }
  return { id: 'self-signed', label: '信任链', status: 'pass', detail: '由 CA 签发（非自签名）' }
}

/** 签名算法强度：md5 / sha1 视为不安全 */
export function checkSignature(signatureName: string): Check {
  const lower = signatureName.toLowerCase()
  if (/md5|md2|sha1(?!\d)/.test(lower)) {
    return {
      id: 'signature',
      label: '签名算法',
      status: 'fail',
      detail: `使用弱签名算法 ${signatureName}，应升级到 SHA-256 或更强`,
    }
  }
  return { id: 'signature', label: '签名算法', status: 'pass', detail: signatureName }
}

/** 公钥强度：RSA 小于 2048 位视为不安全 */
export function checkKeyStrength(cert: CertificateLike): Check {
  const key = cert.publicKey
  if (key?.n) {
    const bits = key.n.bitLength()
    if (bits < 2048) {
      return {
        id: 'key',
        label: '密钥强度',
        status: 'fail',
        detail: `RSA ${bits} 位密钥过短，至少需要 2048 位（推荐 3072 / 4096）`,
      }
    }
    return { id: 'key', label: '密钥强度', status: 'pass', detail: `RSA ${bits} 位` }
  }
  return {
    id: 'key',
    label: '密钥强度',
    status: 'pass',
    detail: `${key?.algorithm ?? '非 RSA（EC / 其它）'}，位数不适用`,
  }
}

/** SAN 检查：现代浏览器要求证书携带 subjectAltName */
export function checkSan(cert: CertificateLike): Check {
  const san = cert.extensions?.find((ext) => ext.name === 'subjectAltName')
  const names = san?.altNames ?? []
  if (names.length === 0) {
    return {
      id: 'san',
      label: 'SAN',
      status: 'warn',
      detail: '缺少 subjectAltName 扩展，现代浏览器可能拒绝信任（仅靠 CN 已不被接受）',
    }
  }
  const list = names.map((n) => `${n.type === 2 ? 'DNS' : 'IP'}:${n.value}`).join(', ')
  return { id: 'san', label: 'SAN', status: 'pass', detail: list }
}

/** 对已解析证书跑全部规则，产出结构化报告（now 可注入，便于单测） */
export function evaluate(cert: CertificateLike, signatureName: string, now: number): Report {
  const checks = [
    checkValidity(cert, now),
    checkSelfSigned(cert),
    checkSignature(signatureName),
    checkKeyStrength(cert),
    checkSan(cert),
  ]
  const info: Record<string, string> = {
    主题: formatAttrs(cert.subject?.attributes ?? []),
    签发者: formatAttrs(cert.issuer?.attributes ?? []),
  }
  return {
    checks,
    info,
    failCount: checks.filter((c) => c.status === 'fail').length,
    warnCount: checks.filter((c) => c.status === 'warn').length,
  }
}

const STATUS_ICON: Record<Status, string> = { pass: '[通过]', warn: '[警告]', fail: '[问题]' }

/** 结构化报告 → 中文文本 */
export function renderReport(report: Report): string {
  const lines: string[] = []
  if (report.failCount > 0) {
    lines.push(`总体结论：不通过（${report.failCount} 个问题，${report.warnCount} 个警告）`)
  } else if (report.warnCount > 0) {
    lines.push(`总体结论：基本可用但有 ${report.warnCount} 个警告`)
  } else {
    lines.push('总体结论：通过，未发现明显问题')
  }
  lines.push('')
  for (const [key, value] of Object.entries(report.info)) {
    lines.push(`${key}：${value}`)
  }
  lines.push('')
  lines.push('检查项：')
  for (const check of report.checks) {
    lines.push(`  ${STATUS_ICON[check.status]} ${check.label}：${check.detail}`)
  }
  return lines.join('\n')
}

/** 解析 PEM 证书并体检；node-forge 按需动态 import，不占首屏 */
export async function checkCertificatePem(pem: string, now: number = Date.now()): Promise<Report> {
  const forge = (await import('node-forge')).default
  let cert: CertificateLike
  try {
    cert = forge.pki.certificateFromPem(pem) as CertificateLike
  } catch {
    throw new SslCheckError('无法解析证书，请粘贴完整的 -----BEGIN CERTIFICATE----- PEM 内容')
  }
  const oidName = cert.signatureOid ? forge.pki.oids[cert.signatureOid] : undefined
  const signatureName = oidName ?? cert.signatureOid ?? '未知签名算法'
  return evaluate(cert, signatureName, now)
}

export async function transform(input: SslCheckInput, _options: SslCheckOptions): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new SslCheckError(`证书超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  const report = await checkCertificatePem(input.text)
  return renderReport(report)
}
