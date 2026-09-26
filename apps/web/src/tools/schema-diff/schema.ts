import { z } from 'zod'

/** 输入契约：两份 Schema 各自限长，避免超大结构卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100_000, '旧 Schema 超过 100,000 字符上限'),
  schemaB: z.string().max(100_000, '新 Schema 超过 100,000 字符上限'),
})

/**
 * 选项契约：
 *  format 决定 diff 的写法（可读报告 / JSON / Markdown 表格）；
 *  ignoreCase 决定比较类型时是否忽略大小写——MySQL 的 INT 与 Postgres 的 int
 *  在数据字典里常常混写，开着能少刷一堆噪音。
 */
export const optionsSchema = z.object({
  format: z.union([z.literal('report'), z.literal('json'), z.literal('markdown')]),
  ignoreCase: z.boolean(),
})

export type SchemaDiffInput = z.infer<typeof inputSchema>
export type SchemaDiffOptions = z.infer<typeof optionsSchema>
