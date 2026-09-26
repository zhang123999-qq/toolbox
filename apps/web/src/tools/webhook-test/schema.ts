import { z } from 'zod'

/** 输入契约：text=webhook URL，payload=JSON 请求体 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  payload: z.string().max(200000, '请求体超过 200,000 字符上限'),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type WebhookTestInput = z.infer<typeof inputSchema>
export type WebhookTestOptions = z.infer<typeof optionsSchema>
