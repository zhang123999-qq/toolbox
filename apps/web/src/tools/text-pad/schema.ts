import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('left'), z.literal('right'), z.literal('both'), z.literal('center')]),
  length: z.union([z.literal('8'), z.literal('16'), z.literal('32'), z.literal('64')]),
  filler: z.string().max(4),
})

export type TextPadInput = z.infer<typeof inputSchema>
export type TextPadOptions = z.infer<typeof optionsSchema>
