import { z } from 'zod'

/** 输入契约：转义后的文本通常比原文更长，上限放宽到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：direction 决定转义还是还原 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('escape'), z.literal('unescape')]),
})

export type UnicodeEscapeInput = z.infer<typeof inputSchema>
export type UnicodeEscapeOptions = z.infer<typeof optionsSchema>
