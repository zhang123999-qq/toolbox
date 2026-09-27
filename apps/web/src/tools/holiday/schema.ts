import { z } from 'zod'

/** 输入契约：一段年份文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type HolidayInput = z.infer<typeof inputSchema>
export type HolidayOptions = z.infer<typeof optionsSchema>
