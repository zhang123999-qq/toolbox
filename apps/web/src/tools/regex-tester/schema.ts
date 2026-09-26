import { z } from 'zod'

/** 输入契约：text=测试文本，pattern=正则表达式（不含 flags，flags 走选项） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  pattern: z.string(),
})

/** 选项契约：JS 正则的 5 个常用标志 */
export const optionsSchema = z.object({
  global: z.boolean(),
  ignoreCase: z.boolean(),
  multiline: z.boolean(),
  dotAll: z.boolean(),
  unicode: z.boolean(),
})

export type RegexTesterInput = z.infer<typeof inputSchema>
export type RegexTesterOptions = z.infer<typeof optionsSchema>
