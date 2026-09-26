import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type SvgoOptimizeInput = z.infer<typeof inputSchema>
export type SvgoOptimizeOptions = z.infer<typeof optionsSchema>
