import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  sortBy: z.union([z.literal('text'), z.literal('number'), z.literal('length')]),
  descending: z.boolean(),
  ignoreCase: z.boolean(),
})

export type SortInput = z.infer<typeof inputSchema>
export type SortOptions = z.infer<typeof optionsSchema>
