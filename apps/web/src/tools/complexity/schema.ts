import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  language: z.union([z.literal('javascript'), z.literal('typescript'), z.literal('python')]),
})

export type ComplexityInput = z.infer<typeof inputSchema>
export type ComplexityOptions = z.infer<typeof optionsSchema>
