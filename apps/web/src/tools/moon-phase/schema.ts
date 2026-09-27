import { z } from 'zod'

/** 输入契约：一个日期串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：月相无开关，保留空对象占位 */
export const optionsSchema = z.object({})

export type MoonPhaseInput = z.infer<typeof inputSchema>
export type MoonPhaseOptions = z.infer<typeof optionsSchema>
