import { z } from 'zod'

/** 输入契约：待计算的 5 段 cron 表达式 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：count 为要列出的触发次数 */
export const optionsSchema = z.object({
  count: z.string(),
})

export type CronNextInput = z.infer<typeof inputSchema>
export type CronNextOptions = z.infer<typeof optionsSchema>
