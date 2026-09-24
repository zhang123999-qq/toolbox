import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('report'), z.literal('unique'), z.literal('dupes')]),
  trim: z.boolean(),
  ignoreCase: z.boolean(),
})

export type DuplicateLinesInput = z.infer<typeof inputSchema>
export type DuplicateLinesOptions = z.infer<typeof optionsSchema>
