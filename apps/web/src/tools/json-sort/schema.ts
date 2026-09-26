import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约：升降序 + 输出排版（pretty 缩进两格，compact 单行） */
export const optionsSchema = z.object({
  descending: z.boolean(),
  format: z.union([z.literal('pretty'), z.literal('compact')]),
})

export type JsonSortInput = z.infer<typeof inputSchema>
export type JsonSortOptions = z.infer<typeof optionsSchema>
