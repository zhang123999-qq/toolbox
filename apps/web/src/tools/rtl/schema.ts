import { z } from 'zod'

/** 输入契约：text=待分析文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '文本超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type RtlInput = z.infer<typeof inputSchema>
export type RtlOptions = z.infer<typeof optionsSchema>
