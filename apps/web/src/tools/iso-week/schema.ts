import { z } from 'zod'

/** 输入契约：一个日期串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：ISO 周格式无开关 */
export const optionsSchema = z.object({})

export type IsoWeekInput = z.infer<typeof inputSchema>
export type IsoWeekOptions = z.infer<typeof optionsSchema>
