import { z } from 'zod'

/** 输入契约：一个日期串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：季度计算无开关 */
export const optionsSchema = z.object({})

export type QuarterInput = z.infer<typeof inputSchema>
export type QuarterOptions = z.infer<typeof optionsSchema>
