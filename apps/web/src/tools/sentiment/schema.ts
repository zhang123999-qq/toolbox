import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  language: z.union([z.literal('auto'), z.literal('en'), z.literal('zh')]),
})

export type SentimentInput = z.infer<typeof inputSchema>
export type SentimentOptions = z.infer<typeof optionsSchema>
