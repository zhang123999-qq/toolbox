import { z } from 'zod'

/** 输入契约：多行「日期 | 标题」 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：时间线无开关 */
export const optionsSchema = z.object({})

export type TimelineInput = z.infer<typeof inputSchema>
export type TimelineOptions = z.infer<typeof optionsSchema>
