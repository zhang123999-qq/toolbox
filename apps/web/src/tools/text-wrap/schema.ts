import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('auto'), z.literal('word'), z.literal('char')]),
  width: z.union([z.literal('40'), z.literal('60'), z.literal('80')]),
  breakLong: z.boolean(),
})

export type TextWrapInput = z.infer<typeof inputSchema>
export type TextWrapOptions = z.infer<typeof optionsSchema>
