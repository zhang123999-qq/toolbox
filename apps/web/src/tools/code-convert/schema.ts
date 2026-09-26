import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50,000 字符上限'),
})

export const optionsSchema = z.object({
  from: z.union([z.literal('javascript'), z.literal('python')]),
  to: z.union([z.literal('javascript'), z.literal('python')]),
})

export type CodeConvertInput = z.infer<typeof inputSchema>
export type CodeConvertOptions = z.infer<typeof optionsSchema>
