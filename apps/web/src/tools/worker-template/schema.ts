import { z } from 'zod'

/** 主输入：路由文本（每行「METHOD /path」） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
  /** Worker 名称 */
  name: z.string().max(63, '名称超过 63 字符上限'),
  /** cron 表达式（启用 cron 特性时必填） */
  cronSchedule: z.string().max(100, 'cron 表达式超过 100 字符上限'),
})

export type WorkerTemplateInput = z.infer<typeof inputSchema>

/** 特性开关 */
export const optionsSchema = z.object({
  router: z.boolean(),
  kv: z.boolean(),
  d1: z.boolean(),
  r2: z.boolean(),
  cron: z.boolean(),
})

export type WorkerTemplateOptions = z.infer<typeof optionsSchema>
