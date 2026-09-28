import { z } from 'zod'

/** 交互式反应测试：无文本输入 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type ReactionInput = z.infer<typeof inputSchema>
export type ReactionOptions = z.infer<typeof optionsSchema>
