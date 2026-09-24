import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  tone: z.union([z.literal('symbol'), z.literal('num'), z.literal('none')]),
})

export type PinyinToolInput = z.infer<typeof inputSchema>
export type PinyinToolOptions = z.infer<typeof optionsSchema>
