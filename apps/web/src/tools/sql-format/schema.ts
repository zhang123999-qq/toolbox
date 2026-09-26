import { z } from 'zod'

/** 输入契约：限制长度，避免超长 SQL 卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 选项契约：关键字大小写策略 + 缩进档位宽度 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('upper'), z.literal('lower'), z.literal('keep')]),
  indent: z.union([z.literal('2'), z.literal('4'), z.literal('8')]),
})

export type SqlFormatInput = z.infer<typeof inputSchema>
export type SqlFormatOptions = z.infer<typeof optionsSchema>
