import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('left'), z.literal('right'), z.literal('center'), z.literal('fill')]),
  width: z.union([z.literal('20'), z.literal('40'), z.literal('60'), z.literal('80')]),
  filler: z.string().max(4),
})

export type TextAlignInput = z.infer<typeof inputSchema>
export type TextAlignOptions = z.infer<typeof optionsSchema>
