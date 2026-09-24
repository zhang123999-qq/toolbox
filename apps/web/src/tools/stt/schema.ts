import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  language: z.union([z.literal('zh-CN'), z.literal('en-US'), z.literal('ja-JP')]),
})

export type SttInput = z.infer<typeof inputSchema>
export type SttOptions = z.infer<typeof optionsSchema>
