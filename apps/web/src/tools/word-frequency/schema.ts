import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  topN: z.union([z.literal('10'), z.literal('20'), z.literal('50')]),
  ignoreCase: z.boolean(),
  useStopWords: z.boolean(),
})

export type WordFrequencyInput = z.infer<typeof inputSchema>
export type WordFrequencyOptions = z.infer<typeof optionsSchema>
