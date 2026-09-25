import { z } from 'zod'

/** 输入契约 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
})

export type Base32Input = z.infer<typeof inputSchema>
export type Base32Options = z.infer<typeof optionsSchema>
