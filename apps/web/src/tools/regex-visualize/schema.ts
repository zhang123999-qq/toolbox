import { z } from 'zod'

/** 输入契约：text = 正则表达式主体（不含 flags） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type RegexVisualizeInput = z.infer<typeof inputSchema>
export type RegexVisualizeOptions = z.infer<typeof optionsSchema>
