import { Secret, TOTP } from 'otpauth'
import type { TotpInput, TotpOptions } from './schema'

/** 可选位数 / 周期 / 摘要（与 schema、Tool.tsx 保持一致） */
export const DIGITS = ['6', '8'] as const
export const PERIODS = ['30', '60'] as const
export const ALGORITHMS = ['SHA1', 'SHA256', 'SHA512'] as const

/**
 * 解析 Base32 密钥。
 * 宽容处理常见的复制粘贴污染：去掉空格与小写化；`otpauth://` URI 里的 secret 也直接可用。
 */
export function parseSecret(text: string): Secret {
  const cleaned = text.replace(/\s+/g, '').toUpperCase()
  if (cleaned === '') throw new Error('请先填入 Base32 共享密钥')
  try {
    return Secret.fromBase32(cleaned)
  } catch {
    throw new Error(
      '不是合法的 Base32 密钥：只允许 A–Z 与 2–7（可含空格），当前是「' +
        cleaned.slice(0, 24) +
        '」',
    )
  }
}

/**
 * 生成 TOTP。
 * `timestamp` 可注入（毫秒）——不注入就用当前时间，这正是 TOTP 的本意；
 * 单测靠注入固定时间戳来对照 RFC 6238 的已知向量。
 */
export function generateTotp(
  secretText: string,
  options: TotpOptions,
  timestamp: number = Date.now(),
): string {
  const totp = new TOTP({
    secret: parseSecret(secretText),
    algorithm: options.algorithm,
    digits: Number(options.digits),
    period: Number(options.period),
  })
  return totp.generate({ timestamp })
}

/** 该周期内的剩余有效秒数（同样可注入时间戳） */
export function remainingSeconds(period: string, timestamp: number = Date.now()): number {
  const window = Number(period)
  return window - Math.floor(timestamp / 1000) % window
}

export function transform(input: TotpInput, options: TotpOptions): string {
  if (input.text.trim() === '') return ''
  const code = generateTotp(input.text, options)
  const remain = remainingSeconds(options.period)
  return `${code}\n\n${options.digits} 位｜周期 ${options.period} 秒｜${options.algorithm}｜本轮还剩 ${remain} 秒`
}
