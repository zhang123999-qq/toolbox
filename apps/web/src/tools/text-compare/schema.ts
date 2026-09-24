import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程；附加输入框用于「两段平级内容」 */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50,000 字符上限'),
  textB: z.string(),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('report'), z.literal('diff')]),
})

export type TextCompareInput = z.infer<typeof inputSchema>
export type TextCompareOptions = z.infer<typeof optionsSchema>
