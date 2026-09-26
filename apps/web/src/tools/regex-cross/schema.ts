import { z } from 'zod'

/** 输入契约：text = JS 正则字面量（如 /abc/g）或纯模式串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：目标语言 */
export const optionsSchema = z.object({
  target: z.union([z.literal('python'), z.literal('java')]),
})

export type RegexCrossInput = z.infer<typeof inputSchema>
export type RegexCrossOptions = z.infer<typeof optionsSchema>
