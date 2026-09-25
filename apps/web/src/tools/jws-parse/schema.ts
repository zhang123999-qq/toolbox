import { z } from 'zod'

/** 输入契约：text 是 compact JWS；secret 由附加输入框承载 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  secret: z.string(),
})

/** 选项契约：只接受与签名时一致的算法，防止 alg 混淆攻击 */
export const optionsSchema = z.object({
  algorithm: z.union([z.literal('HS256'), z.literal('HS384'), z.literal('HS512')]),
})

export type JwsParseInput = z.infer<typeof inputSchema>
export type JwsParseOptions = z.infer<typeof optionsSchema>
