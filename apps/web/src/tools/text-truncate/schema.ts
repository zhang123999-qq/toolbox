import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('chars'), z.literal('words'), z.literal('lines')]),
  limit: z.union([z.literal('20'), z.literal('50'), z.literal('100'), z.literal('200')]),
  ellipsis: z.string().max(8),
})

export type TextTruncateInput = z.infer<typeof inputSchema>
export type TextTruncateOptions = z.infer<typeof optionsSchema>
