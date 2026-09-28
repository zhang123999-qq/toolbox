import { z } from 'zod'

export const MAX_INPUT = 200_000

/** 输入契约：HTML 源码 */
export const inputSchema = z.object({
  text: z.string().max(MAX_INPUT, `输入超过 ${MAX_INPUT} 字符上限`),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type AltCheckInput = z.infer<typeof inputSchema>
export type AltCheckOptions = z.infer<typeof optionsSchema>
