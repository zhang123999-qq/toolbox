import { z } from 'zod'

/** 输入契约：时长文本（秒 / 分:秒 / 时:分:秒），上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无额外选项 */
export const optionsSchema = z.object({})

export type TimerInput = z.infer<typeof inputSchema>
export type TimerOptions = z.infer<typeof optionsSchema>
