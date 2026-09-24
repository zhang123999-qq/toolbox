import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1000, '输入超过 1,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  chinese: z.union([z.literal('pinyin'), z.literal('keep'), z.literal('drop')]),
  separator: z.union([z.literal('dash'), z.literal('underscore')]),
  lowercase: z.boolean(),
})

export type SlugInput = z.infer<typeof inputSchema>
export type SlugOptions = z.infer<typeof optionsSchema>
