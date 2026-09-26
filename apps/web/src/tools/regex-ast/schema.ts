import { z } from 'zod'

/** 输入契约：text = 正则表达式主体 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type RegexAstInput = z.infer<typeof inputSchema>
export type RegexAstOptions = z.infer<typeof optionsSchema>
