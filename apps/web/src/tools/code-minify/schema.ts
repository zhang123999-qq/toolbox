import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  language: z.union([z.literal('js'), z.literal('css'), z.literal('html')]),
})

export type CodeMinifyInput = z.infer<typeof inputSchema>
export type CodeMinifyOptions = z.infer<typeof optionsSchema>
