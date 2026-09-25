import { HOTP, Secret, TOTP } from 'otpauth'
import QRCode from 'qrcode'
import type { OtpQrInput, OtpQrOptions } from './schema'

/** 可选值（与 schema、Tool.tsx 保持一致） */
export const TYPES = ['totp', 'hotp'] as const
export const DIGITS = ['6', '8'] as const
export const PERIODS = ['30', '60'] as const
export const ALGORITHMS = ['SHA1', 'SHA256', 'SHA512'] as const

/** 二维码静区（模块数）：按规范是 4，字符画里取 2 以控制宽度 */
const QUIET_ZONE = 2

/** 解析 Base32 密钥（宽容空格与小写） */
export function parseSecret(text: string): Secret {
  const cleaned = text.replace(/\s+/g, '').toUpperCase()
  if (cleaned === '') throw new Error('请先填入 Base32 共享密钥')
  try {
    return Secret.fromBase32(cleaned)
  } catch {
    throw new Error('不是合法的 Base32 密钥：只允许 A–Z 与 2–7（可含空格）')
  }
}

/** 计数器：HOTP 必填非负整数 */
export function parseCounter(value: string): number {
  const cleaned = value.trim()
  if (!/^\d+$/.test(cleaned)) throw new Error('HOTP 需要非负整数的计数器，当前是「' + cleaned + '」')
  return Number(cleaned)
}

/** 账户名与签发者至少有一个，否则二维码里只剩一串密钥，导出后很难辨认 */
export function requireLabel(input: OtpQrInput): { issuer: string; label: string } {
  const issuer = input.issuer.trim()
  const account = input.account.trim()
  if (issuer === '' && account === '') {
    throw new Error('请至少填写「账户名」或「签发者」，否则绑定后认不出这是哪个账号')
  }
  return { issuer, label: account === '' ? issuer : account }
}

/** 构造 otpauth:// URI（交给 otpauth 生成，保证与主流验证器一致） */
export function buildUri(input: OtpQrInput, options: OtpQrOptions): string {
  const { issuer, label } = requireLabel(input)
  const common = {
    secret: parseSecret(input.text),
    algorithm: options.algorithm,
    digits: Number(options.digits),
    label,
    issuer: issuer === '' ? undefined : issuer,
  }
  if (options.type === 'hotp') {
    return new HOTP({ ...common, counter: parseCounter(input.counter) }).toString()
  }
  return new TOTP({ ...common, period: Number(options.period) }).toString()
}

/**
 * 字符画二维码。
 * 只取 `QRCode.create` 的模块矩阵自行渲染——不走 canvas、也不依赖 Node，
 * 浏览器与测试环境行为一致，且同样的输入永远得到同样的输出。
 */
export function renderQrAscii(text: string): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  const data = qr.modules.data
  const blank = '  '.repeat(size + QUIET_ZONE * 2)
  const lines: string[] = []
  for (let i = 0; i < QUIET_ZONE; i += 1) lines.push(blank)
  for (let row = 0; row < size; row += 1) {
    let line = '  '.repeat(QUIET_ZONE)
    for (let col = 0; col < size; col += 1) {
      line += data[row * size + col] ? '██' : '  '
    }
    lines.push(line + '  '.repeat(QUIET_ZONE))
  }
  for (let i = 0; i < QUIET_ZONE; i += 1) lines.push(blank)
  return lines.join('\n')
}

export function transform(input: OtpQrInput, options: OtpQrOptions): string {
  if (input.text.trim() === '') return ''
  const uri = buildUri(input, options)
  return `${uri}\n\n${renderQrAscii(uri)}`
}
