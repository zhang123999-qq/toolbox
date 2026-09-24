import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  syntax: z.union([z.literal('mustache'), z.literal('dollar')]),
  keepMissing: z.boolean(),
})

export type TemplateInput = z.infer<typeof inputSchema>
export type TemplateOptions = z.infer<typeof optionsSchema>
