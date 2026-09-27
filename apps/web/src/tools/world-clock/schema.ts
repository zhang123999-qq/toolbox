import { z } from 'zod'

/** 输入契约：每行一个 IANA 时区名 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：是否使用 12 小时制 */
export const optionsSchema = z.object({
  hour12: z.boolean(),
})

export type WorldClockInput = z.infer<typeof inputSchema>
export type WorldClockOptions = z.infer<typeof optionsSchema>
