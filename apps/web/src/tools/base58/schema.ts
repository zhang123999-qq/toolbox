import { z } from 'zod'

/** 输入契约 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode 选择字母表变体 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  mode: z.union([z.literal('bitcoin'), z.literal('flickr')]),
})

export type Base58Input = z.infer<typeof inputSchema>
export type Base58Options = z.infer<typeof optionsSchema>
