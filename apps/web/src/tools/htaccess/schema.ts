import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  redirects: z.string(),
  rewrites: z.boolean(),
  cache: z.boolean(),
  hotlink: z.boolean(),
  deny: z.boolean(),
})

export type HtaccessInput = z.infer<typeof inputSchema>
export type HtaccessOptions = z.infer<typeof optionsSchema>
