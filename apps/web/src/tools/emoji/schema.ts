import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100, '输入超过 100 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  category: z.union([
    z.literal('all'),
    z.literal('face'),
    z.literal('hand'),
    z.literal('nature'),
    z.literal('food'),
    z.literal('activity'),
    z.literal('travel'),
    z.literal('object'),
    z.literal('symbol'),
    z.literal('flag'),
  ]),
})

export type EmojiInput = z.infer<typeof inputSchema>
export type EmojiOptions = z.infer<typeof optionsSchema>
