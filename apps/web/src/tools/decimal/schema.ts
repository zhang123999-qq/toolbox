import { z } from 'zod'

/** 输入契约：text=数字或四则表达式，如 0.1 + 0.2 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type DecimalInput = z.infer<typeof inputSchema>
export type DecimalOptions = z.infer<typeof optionsSchema>
