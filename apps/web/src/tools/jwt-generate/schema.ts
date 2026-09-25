import { z } from 'zod'

/** 输入契约：text 是 JSON 形式的 payload；secret 由附加输入框承载 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  secret: z.string(),
})

/** 选项契约：HMAC 家族三种摘要 */
export const optionsSchema = z.object({
  algorithm: z.union([z.literal('HS256'), z.literal('HS384'), z.literal('HS512')]),
})

export type JwtGenerateInput = z.infer<typeof inputSchema>
export type JwtGenerateOptions = z.infer<typeof optionsSchema>
