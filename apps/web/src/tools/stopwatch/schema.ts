import { z } from 'zod'

/** 输入契约：秒表不使用输入框，仅作占位，上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无额外选项 */
export const optionsSchema = z.object({})

export type StopwatchInput = z.infer<typeof inputSchema>
export type StopwatchOptions = z.infer<typeof optionsSchema>
