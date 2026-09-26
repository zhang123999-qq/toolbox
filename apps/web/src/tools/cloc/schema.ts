import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  language: z.union([z.literal('c-style'), z.literal('python'), z.literal('shell')]),
})

export type ClocInput = z.infer<typeof inputSchema>
export type ClocOptions = z.infer<typeof optionsSchema>
