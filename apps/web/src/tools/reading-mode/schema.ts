import { z } from 'zod'

/** 输入契约：主输入框为待提取正文的 HTML */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type ReadingModeInput = z.infer<typeof inputSchema>
export type ReadingModeOptions = z.infer<typeof optionsSchema>
