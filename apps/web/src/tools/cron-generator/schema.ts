import { z } from 'zod'

/** 输入契约：仅作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：5 个 cron 字段，自由填写（星号表示不限制） */
export const optionsSchema = z.object({
  minute: z.string(),
  hour: z.string(),
  dom: z.string(),
  month: z.string(),
  dow: z.string(),
})

export type CronGeneratorInput = z.infer<typeof inputSchema>
export type CronGeneratorOptions = z.infer<typeof optionsSchema>
