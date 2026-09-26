import { z } from 'zod'

/** 输入契约：限制长度，避免超长 SQL 卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 选项契约：`source` 为 auto 时按特征词自动判定原方言 */
export const optionsSchema = z.object({
  source: z.union([z.literal('auto'), z.literal('mysql'), z.literal('postgres')]),
  target: z.union([z.literal('mysql'), z.literal('postgres')]),
})

export type SqlDialectInput = z.infer<typeof inputSchema>
export type SqlDialectOptions = z.infer<typeof optionsSchema>
