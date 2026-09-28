import { z } from 'zod'

/** 交互式听力测试：无文本输入 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type HearingTestInput = z.infer<typeof inputSchema>
export type HearingTestOptions = z.infer<typeof optionsSchema>
