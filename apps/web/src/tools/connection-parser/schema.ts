import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5,000 字符上限'),
})

export const optionsSchema = z.object({})

export type ConnectionParserInput = z.infer<typeof inputSchema>
export type ConnectionParserOptions = z.infer<typeof optionsSchema>
