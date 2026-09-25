import { z } from 'zod'

/** 输入契约：Base64 文本通常比原文更短，上限放宽到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：direction 决定编码还是解码，mode 决定字母表变体 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  mode: z.union([z.literal('standard'), z.literal('urlsafe')]),
})

export type Base64Input = z.infer<typeof inputSchema>
export type Base64Options = z.infer<typeof optionsSchema>
