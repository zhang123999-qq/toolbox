import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '输入超过 5MB 上限'),
})

/** 选项契约：缩进档位与键名排序 */
export const optionsSchema = z.object({
  indent: z.union([z.literal('2'), z.literal('4')]),
  sortKeys: z.boolean(),
})

export type JsonInput = z.infer<typeof inputSchema>
export type JsonOptions = z.infer<typeof optionsSchema>
