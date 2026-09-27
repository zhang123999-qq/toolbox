import { z } from 'zod'

/** 输入契约：一段待解析的年份文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type ChineseZodiacInput = z.infer<typeof inputSchema>
export type ChineseZodiacOptions = z.infer<typeof optionsSchema>
