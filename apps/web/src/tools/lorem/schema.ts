import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  language: z.union([z.literal('zh'), z.literal('en'), z.literal('latin')]),
  unit: z.union([z.literal('paragraph'), z.literal('sentence'), z.literal('word')]),
  count: z.union([z.literal('1'), z.literal('2'), z.literal('3'), z.literal('5')]),
})

export type LoremInput = z.infer<typeof inputSchema>
export type LoremOptions = z.infer<typeof optionsSchema>
