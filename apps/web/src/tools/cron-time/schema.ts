import { z } from 'zod'

/** 输入契约：cron 表达式文本，上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：count 为「输出接下来几次运行」，文本框承载，默认 5 */
export const optionsSchema = z.object({
  count: z.string(),
})

export type CronTimeInput = z.infer<typeof inputSchema>
export type CronTimeOptions = z.infer<typeof optionsSchema>
