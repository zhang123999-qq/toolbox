import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  target: z.union([z.literal('lf'), z.literal('crlf'), z.literal('cr')]),
})

export type LineEndingInput = z.infer<typeof inputSchema>
export type LineEndingOptions = z.infer<typeof optionsSchema>
