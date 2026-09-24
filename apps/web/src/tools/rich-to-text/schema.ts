import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  keepLineBreaks: z.boolean(),
})

export type RichToTextInput = z.infer<typeof inputSchema>
export type RichToTextOptions = z.infer<typeof optionsSchema>
