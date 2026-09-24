import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  topN: z.union([z.literal('3'), z.literal('5')]),
  preview: z.boolean(),
})

export type CharsetDetectInput = z.infer<typeof inputSchema>
export type CharsetDetectOptions = z.infer<typeof optionsSchema>
