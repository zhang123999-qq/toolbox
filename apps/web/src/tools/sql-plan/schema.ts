import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(10000, '输入超过 10,000 字符上限'),
})

export const optionsSchema = z.object({})

export type SqlPlanInput = z.infer<typeof inputSchema>
export type SqlPlanOptions = z.infer<typeof optionsSchema>
