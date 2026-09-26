import { z } from 'zod'

/** 输入契约：一条或多条 CREATE TABLE，限长与 sql-to-orm 对齐 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 纯转换，无可调选项 */
export const optionsSchema = z.object({})

export type SqlToJsonInput = z.infer<typeof inputSchema>
export type SqlToJsonOptions = z.infer<typeof optionsSchema>
