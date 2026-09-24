import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程；附加输入框用于「两段平级内容」 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
  textB: z.string(),
  textC: z.string(),
})

/** 选项契约 */
export const optionsSchema = z.object({
  prefer: z.union([z.literal('auto'), z.literal('mine'), z.literal('theirs')]),
})

export type TextMergeInput = z.infer<typeof inputSchema>
export type TextMergeOptions = z.infer<typeof optionsSchema>
