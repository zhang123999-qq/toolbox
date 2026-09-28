import { z } from 'zod'

/** 输入契约：主输入框为待朗读的文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type ReadAloudInput = z.infer<typeof inputSchema>
export type ReadAloudOptions = z.infer<typeof optionsSchema>
