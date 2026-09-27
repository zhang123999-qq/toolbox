import { z } from 'zod'

/** 输入契约：一段待解析的日期文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 方向：公历→农历 或 农历→公历 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('solar2lunar'), z.literal('lunar2solar')]),
})

export type LunarInput = z.infer<typeof inputSchema>
export type LunarOptions = z.infer<typeof optionsSchema>
