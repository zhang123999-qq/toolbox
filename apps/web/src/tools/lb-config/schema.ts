import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  type: z.union([z.literal('nginx'), z.literal('haproxy')]),
  servers: z.string(),
  algorithm: z.union([z.literal('round_robin'), z.literal('least_conn'), z.literal('ip_hash')]),
  healthCheck: z.boolean(),
})

export type LbConfigInput = z.infer<typeof inputSchema>
export type LbConfigOptions = z.infer<typeof optionsSchema>
