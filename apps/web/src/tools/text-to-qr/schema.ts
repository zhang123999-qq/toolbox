import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(2000, '输入超过 2,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  level: z.union([z.literal('L'), z.literal('M'), z.literal('Q'), z.literal('H')]),
})

export type TextToQrInput = z.infer<typeof inputSchema>
export type TextToQrOptions = z.infer<typeof optionsSchema>
