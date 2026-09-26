import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  minBlock: z.coerce.number().int().min(2).max(20).default(3),
})

export type DuplicateCodeInput = z.infer<typeof inputSchema>
export type DuplicateCodeOptions = z.infer<typeof optionsSchema>
