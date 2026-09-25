import { z } from 'zod'

/** 输入契约：text 是 Base32 形式的共享密钥（otpauth:// 里的 secret） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：位数 / 周期 / 摘要，三项必须与服务端一致 */
export const optionsSchema = z.object({
  digits: z.union([z.literal('6'), z.literal('8')]),
  period: z.union([z.literal('30'), z.literal('60')]),
  algorithm: z.union([z.literal('SHA1'), z.literal('SHA256'), z.literal('SHA512')]),
})

export type TotpInput = z.infer<typeof inputSchema>
export type TotpOptions = z.infer<typeof optionsSchema>
