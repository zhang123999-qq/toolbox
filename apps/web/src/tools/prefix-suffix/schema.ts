import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  prefix: z.string().max(200),
  suffix: z.string().max(200),
  skipEmpty: z.boolean(),
})

export type PrefixSuffixInput = z.infer<typeof inputSchema>
export type PrefixSuffixOptions = z.infer<typeof optionsSchema>
