import { z } from 'zod'

/** 输入契约：text=语言标签 */
export const inputSchema = z.object({
  text: z.string().max(200, '语言标签超过 200 字符上限'),
})

export const optionsSchema = z.object({})

export type LanguageTagInput = z.infer<typeof inputSchema>
export type LanguageTagOptions = z.infer<typeof optionsSchema>
