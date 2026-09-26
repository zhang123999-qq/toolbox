import { z } from 'zod'

/** 输入契约：触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const FLOWS = ['authorization-code', 'implicit', 'client-credentials'] as const

/** 选项契约：选 OAuth 授权类型 */
export const optionsSchema = z.object({
  flow: z.union([
    z.literal('authorization-code'),
    z.literal('implicit'),
    z.literal('client-credentials'),
  ]),
})

export type OAuthInput = z.infer<typeof inputSchema>
export type OAuthOptions = z.infer<typeof optionsSchema>
