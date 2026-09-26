import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(2000, '输入超过 2,000 字符上限'),
})

export const optionsSchema = z.object({})

export type SemverCompareInput = z.infer<typeof inputSchema>
export type SemverCompareOptions = z.infer<typeof optionsSchema>
