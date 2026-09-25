import { z } from 'zod'

/** 输入契约：text 是 Base32 共享密钥，counter 由附加输入框承载 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  counter: z.string(),
})

/** 选项契约：位数与摘要；RFC 4226 本身只定义 SHA1，另两种是常见扩展 */
export const optionsSchema = z.object({
  digits: z.union([z.literal('6'), z.literal('8')]),
  algorithm: z.union([z.literal('SHA1'), z.literal('SHA256'), z.literal('SHA512')]),
})

export type HotpInput = z.infer<typeof inputSchema>
export type HotpOptions = z.infer<typeof optionsSchema>
