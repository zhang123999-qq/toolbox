import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  pattern: z.string().max(200),
  replacement: z.string().max(200),
  global: z.boolean(),
  ignoreCase: z.boolean(),
  multiline: z.boolean(),
})

export type RegexReplaceInput = z.infer<typeof inputSchema>
export type RegexReplaceOptions = z.infer<typeof optionsSchema>
