import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约：pattern 是 JSONPath 表达式，mode 决定输出值还是输出路径 */
export const optionsSchema = z.object({
  pattern: z.string(),
  mode: z.union([z.literal('value'), z.literal('path')]),
})

export type JsonPathInput = z.infer<typeof inputSchema>
export type JsonPathOptions = z.infer<typeof optionsSchema>
