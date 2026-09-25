import { z } from 'zod'

/** 输入契约：text 是 Base32 共享密钥；issuer / account / counter 由附加输入框承载 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  issuer: z.string(),
  account: z.string(),
  counter: z.string(),
})

/** 选项契约：type 决定 TOTP 还是 HOTP；period 只对 TOTP 有意义 */
export const optionsSchema = z.object({
  type: z.union([z.literal('totp'), z.literal('hotp')]),
  digits: z.union([z.literal('6'), z.literal('8')]),
  period: z.union([z.literal('30'), z.literal('60')]),
  algorithm: z.union([z.literal('SHA1'), z.literal('SHA256'), z.literal('SHA512')]),
})

export type OtpQrInput = z.infer<typeof inputSchema>
export type OtpQrOptions = z.infer<typeof optionsSchema>
