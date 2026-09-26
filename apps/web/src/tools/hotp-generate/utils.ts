import { HOTP, Secret } from 'otpauth'
import type { HotpInput, HotpOptions } from './schema'

/** 可选位数与摘要（与 schema、Tool.tsx 保持一致） */
export const DIGITS = ['6', '8'] as const
export const ALGORITHMS = ['SHA1', 'SHA256', 'SHA512'] as const

/** 计数器上限：再大的计数器没有实际意义，也避免 parseInt 溢出 */
const MAX_COUNTER = 2 ** 53 - 1

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

/** 计数器必须是非负整数；允许前后空格，不接受 1e3 这类写法 */
export function parseCounter(value: string): number {
  const cleaned = value.trim()
  if (cleaned === '') throw new Error('请先填入计数器（从 0 开始的整数）')
  if (!/^\d+$/.test(cleaned)) throw new Error('计数器必须是非负整数，当前是「' + cleaned + '」')
  const counter = Number(cleaned)
  if (!Number.isSafeInteger(counter) || counter > MAX_COUNTER) {
    throw new Error('计数器超出范围')
  }
  return counter
}

/** 生成 HOTP：同样的密钥 + 计数器 + 参数，永远得到同样的口令（可复现） */
export function generateHotp(
  secretText: string,
  counterValue: string,
  options: HotpOptions,
): string {
  const hotp = new HOTP({
    secret: parseSecret(secretText),
    algorithm: options.algorithm,
    digits: Number(options.digits),
    counter: parseCounter(counterValue),
  })
  return hotp.generate()
}

export function transform(input: HotpInput, options: HotpOptions): string {
  if (input.text.trim() === '') return ''
  const code = generateHotp(input.text, input.counter, options)
  return `${code}\n\n${options.digits} 位｜计数器 ${parseCounter(input.counter)}｜${options.algorithm}`
}
