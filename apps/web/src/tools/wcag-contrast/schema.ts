import { z } from 'zod'

/** 输入契约：text=前景色；bg=背景色 */
export const inputSchema = z.object({
  text: z.string().max(60, '前景色超过 60 字符上限'),
  bg: z.string().max(60, '背景色超过 60 字符上限'),
})

export const optionsSchema = z.object({})

export type WcagContrastInput = z.infer<typeof inputSchema>
export type WcagContrastOptions = z.infer<typeof optionsSchema>
