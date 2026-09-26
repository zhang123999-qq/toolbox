import { z } from 'zod'

/** 输入契约：待解析的 5 段 cron 表达式 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type CronParserInput = z.infer<typeof inputSchema>
export type CronParserOptions = z.infer<typeof optionsSchema>
